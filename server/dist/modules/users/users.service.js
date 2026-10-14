"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcryptjs");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
const role_enum_1 = require("../../common/enums/role.enum");
let UsersService = class UsersService {
    prisma;
    redisService;
    constructor(prisma, redisService) {
        this.prisma = prisma;
        this.redisService = redisService;
    }
    async findAllStudents(grade, search) {
        const where = { role: role_enum_1.Role.STUDENT };
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
    async approveStudent(id) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('المستخدم غير موجود');
        const updated = await this.prisma.user.update({
            where: { id },
            data: { isApproved: true },
        });
        return {
            message: 'تمت الموافقة على حساب الطالب بنجاح',
            user: { id: updated.id, name: updated.name, isApproved: updated.isApproved },
        };
    }
    async toggleBlockStudent(id) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('المستخدم غير موجود');
        const newBlockedState = !user.isBlocked;
        const updated = await this.prisma.user.update({
            where: { id },
            data: { isBlocked: newBlockedState },
        });
        if (newBlockedState) {
            await this.redisService.invalidateActiveSession(id);
            await this.redisService.revokeRefreshTokenHash(id);
            if (this.prisma.deviceSession) {
                await this.prisma.deviceSession.updateMany({
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
    async resetStudentDevice(id) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('المستخدم غير موجود');
        await this.redisService.invalidateActiveSession(id);
        await this.redisService.revokeRefreshTokenHash(id);
        if (this.prisma.deviceSession) {
            await this.prisma.deviceSession.updateMany({
                where: { userId: id },
                data: { isRevoked: true },
            });
        }
        return {
            message: 'تم إعادة تعيين قيد الجهاز للطالب بنجاح. يمكنه الآن تسجيل الدخول من جهازه الجديد.',
        };
    }
    async adminCreateUser(dto) {
        const cleanPhone = dto.phone.trim();
        const existing = await this.prisma.user.findUnique({
            where: { phone: cleanPhone },
        });
        if (existing) {
            throw new common_1.ConflictException('رقم الهاتف مسجل بالفعل مسبقاً');
        }
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: {
                name: dto.name.trim(),
                phone: cleanPhone,
                parentPhone: dto.parentPhone?.trim() || null,
                password: hashedPassword,
                role: dto.role || role_enum_1.Role.STUDENT,
                grade: dto.grade,
                isApproved: true,
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
    async deleteStudent(id) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('المستخدم غير موجود');
        await this.redisService.invalidateActiveSession(id);
        await this.redisService.revokeRefreshTokenHash(id);
        await this.prisma.user.delete({ where: { id } });
        return {
            message: 'تم حذف حساب الطالب بنجاح',
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], UsersService);
//# sourceMappingURL=users.service.js.map