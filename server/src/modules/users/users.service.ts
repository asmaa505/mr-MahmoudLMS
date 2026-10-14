import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AdminCreateUserDto } from './dto/create-student.dto';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * List all students with filtering.
   */
  async findAllStudents(grade?: string, search?: string) {
    const where: any = { role: Role.STUDENT };

    if (grade) {
      where.grade = grade;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        parentPhone: true,
        grade: true,
        role: true,
        isApproved: true,
        isBlocked: true,
        createdAt: true,
        _count: {
          select: {
            enrollments: true,
            quizAttempts: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Approve a student registration.
   */
  async approveStudent(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isApproved: true },
    });

    return {
      message: 'تمت الموافقة على حساب الطالب بنجاح',
      user: { id: updated.id, name: updated.name, isApproved: updated.isApproved },
    };
  }

  /**
   * Toggle student block status and immediately kick them off all devices if blocked.
   */
  async toggleBlockStudent(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');

    const newBlockedState = !user.isBlocked;

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isBlocked: newBlockedState },
    });

    // If blocked, immediately purge active Redis session and revoke all DB sessions
    if (newBlockedState) {
      await this.redisService.invalidateActiveSession(id);
      await this.redisService.revokeRefreshTokenHash(id);
      if ((this.prisma as any).deviceSession) {
        await (this.prisma as any).deviceSession.updateMany({
          where: { userId: id },
          data: { isRevoked: true },
        });
      }
    }

    return {
      message: newBlockedState ? 'تم حظر الطالب وإنهاء جلسته فوراً' : 'تم فك حظر الطالب بنجاح',
      user: { id: updated.id, name: updated.name, isBlocked: updated.isBlocked },
    };
  }

  /**
   * Teacher resets student device restriction (e.g. student bought a new phone).
   */
  async resetStudentDevice(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');

    // Purge session in Redis so student can log in anew on their new device
    await this.redisService.invalidateActiveSession(id);
    await this.redisService.revokeRefreshTokenHash(id);

    if ((this.prisma as any).deviceSession) {
      await (this.prisma as any).deviceSession.updateMany({
        where: { userId: id },
        data: { isRevoked: true },
      });
    }

    return {
      message: 'تم إعادة تعيين قيد الجهاز للطالب بنجاح. يمكنه الآن تسجيل الدخول من جهازه الجديد.',
    };
  }

  /**
   * Create account directly from teacher/admin panel.
   */
  async adminCreateUser(dto: AdminCreateUserDto) {
    const cleanPhone = dto.phone.trim();

    const existing = await this.prisma.user.findUnique({
      where: { phone: cleanPhone },
    });

    if (existing) {
      throw new ConflictException('رقم الهاتف مسجل بالفعل مسبقاً');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        phone: cleanPhone,
        parentPhone: dto.parentPhone?.trim() || null,
        password: hashedPassword,
        role: dto.role || Role.STUDENT,
        grade: dto.grade,
        isApproved: true, // Created by admin = auto-approved
        isBlocked: false,
      },
    });

    return {
      message: 'تم إنشاء الحساب بنجاح',
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        parentPhone: user.parentPhone,
        role: user.role,
        grade: user.grade,
      },
    };
  }

  /**
   * Delete student.
   */
  async deleteStudent(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');

    await this.redisService.invalidateActiveSession(id);
    await this.redisService.revokeRefreshTokenHash(id);

    await this.prisma.user.delete({ where: { id } });

    return {
      message: 'تم حذف حساب الطالب بنجاح',
    };
  }
}
