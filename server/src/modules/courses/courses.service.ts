import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { AuthenticatedUser } from '../../common/interfaces/auth-payload.interface';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all courses with optional grade filter and student enrollment status.
   */
  async findAll(grade?: string, user?: AuthenticatedUser) {
    const whereClause: any = {};

    // Filter by grade if provided
    if (grade) {
      whereClause.grade = grade;
    }

    // Only Admins/Teachers can view unpublished courses
    if (!user || user.role === Role.STUDENT) {
      whereClause.isPublished = true;
    }

    const courses = await this.prisma.course.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            chapters: true,
            enrollments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Check enrollment for student
    let enrolledCourseIds = new Set<string>();
    if (user && user.role === Role.STUDENT) {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { userId: user.id },
        select: { courseId: true },
      });
      enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));
    }

    return courses.map((course) => ({
      ...course,
      isEnrolled: user?.role === Role.ADMIN || user?.role === Role.TEACHER
        ? true
        : enrolledCourseIds.has(course.id),
    }));
  }

  /**
   * Get complete course details with curriculum structure.
   */
  async findOne(id: string, user?: AuthenticatedUser) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        chapters: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                duration: true,
                durationSeconds: true,
                order: true,
                isFree: true,
                chapterId: true,
                createdAt: true,
                // Notice: videoUrl is excluded here for security, provided via signed-url endpoint!
              },
            },
            quizzes: {
              select: {
                id: true,
                title: true,
                duration: true,
                passingScore: true,
                isMandatory: true,
                _count: { select: { questions: true } },
              },
            },
            homeworks: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('الكورس المطلوب غير موجود');
    }

    let isEnrolled = false;
    if (user) {
      if (user.role === Role.ADMIN || user.role === Role.TEACHER) {
        isEnrolled = true;
      } else {
        const enrollment = await this.prisma.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: user.id,
              courseId: id,
            },
          },
        });
        isEnrolled = !!enrollment;
      }
    }

    return {
      ...course,
      isEnrolled,
    };
  }

  /**
   * Create a new physics course.
   */
  async create(dto: CreateCourseDto) {
    const course = await this.prisma.course.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        image:
          dto.image?.trim() ||
          'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=600&auto=format&fit=crop',
        grade: dto.grade,
        isPublished: dto.isPublished ?? true,
      },
    });

    return {
      message: 'تم إنشاء الكورس بنجاح',
      course,
    };
  }

  /**
   * Update course details.
   */
  async update(id: string, dto: UpdateCourseDto) {
    await this.ensureCourseExists(id);

    const updated = await this.prisma.course.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.description !== undefined && { description: dto.description.trim() }),
        ...(dto.image !== undefined && { image: dto.image.trim() }),
        ...(dto.grade !== undefined && { grade: dto.grade }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
      },
    });

    return {
      message: 'تم تحديث بيانات الكورس بنجاح',
      course: updated,
    };
  }

  /**
   * Delete course.
   */
  async remove(id: string) {
    await this.ensureCourseExists(id);

    await this.prisma.course.delete({
      where: { id },
    });

    return {
      message: 'تم حذف الكورس وجميع ملحقاته بنجاح',
    };
  }

  /**
   * Unlock course for student using activation code.
   */
  async unlockCourseWithCode(userId: string, rawCode: string) {
    const cleanCode = rawCode.trim().toUpperCase();

    // Process redemption inside an isolated database transaction to prevent concurrent exploitation
    return await this.prisma.$transaction(async (tx) => {
      const activationCode = await tx.activationCode.findUnique({
        where: { code: cleanCode },
        include: {
          course: true,
          lesson: {
            include: {
              chapter: {
                include: {
                  course: true,
                },
              },
            },
          },
        },
      });

      if (!activationCode) {
        throw new NotFoundException('كود التفعيل غير صحيح أو غير موجود');
      }

      if (activationCode.isUsed) {
        throw new BadRequestException('هذا الكود مستخدم من قبل');
      }

      let targetCourseId = activationCode.courseId;
      if (activationCode.lessonId && activationCode.lesson) {
        targetCourseId = activationCode.lesson.chapter.courseId;
      }

      if (!targetCourseId) {
        throw new BadRequestException('كود التفعيل غير مقترن بكورس دراسي صالح');
      }

      // Check if user is already enrolled
      const existing = await tx.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: targetCourseId,
          },
        },
      });

      if (existing) {
        throw new ConflictException('أنت مشترك بالفعل في هذا الكورس');
      }

      // Atomically transition code status to USED instantly to prevent race conditions
      const updateResult = await tx.activationCode.updateMany({
        where: {
          id: activationCode.id,
          isUsed: false,
        },
        data: {
          isUsed: true,
          usedById: userId,
          usedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        throw new BadRequestException('هذا الكود مستخدم من قبل');
      }

      const enrollment = await tx.enrollment.create({
        data: {
          userId,
          courseId: targetCourseId,
        },
      });

      const courseTitle =
        activationCode.course?.title ||
        activationCode.lesson?.chapter.course.title ||
        'الكورس';

      return {
        message: `تم بنجاح تفعيل واشتراك في: ${courseTitle}`,
        enrollment,
        courseId: targetCourseId,
      };
    });
  }

  private async ensureCourseExists(id: string) {
    const exists = await this.prisma.course.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('الكورس المحدد غير موجود');
    }
    return exists;
  }
}
