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
exports.CoursesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const role_enum_1 = require("../../common/enums/role.enum");
let CoursesService = class CoursesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(grade, user) {
        const whereClause = {};
        if (grade) {
            whereClause.grade = grade;
        }
        if (!user || user.role === role_enum_1.Role.STUDENT) {
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
        let enrolledCourseIds = new Set();
        if (user && user.role === role_enum_1.Role.STUDENT) {
            const enrollments = await this.prisma.enrollment.findMany({
                where: { userId: user.id },
                select: { courseId: true },
            });
            enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));
        }
        return courses.map((course) => ({
            ...course,
            isEnrolled: user?.role === role_enum_1.Role.ADMIN || user?.role === role_enum_1.Role.TEACHER
                ? true
                : enrolledCourseIds.has(course.id),
        }));
    }
    async findOne(id, user) {
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
            throw new common_1.NotFoundException('الكورس المطلوب غير موجود');
        }
        let isEnrolled = false;
        if (user) {
            if (user.role === role_enum_1.Role.ADMIN || user.role === role_enum_1.Role.TEACHER) {
                isEnrolled = true;
            }
            else {
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
    async create(dto) {
        const course = await this.prisma.course.create({
            data: {
                title: dto.title.trim(),
                description: dto.description?.trim() || null,
                image: dto.image?.trim() ||
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
    async update(id, dto) {
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
    async remove(id) {
        await this.ensureCourseExists(id);
        await this.prisma.course.delete({
            where: { id },
        });
        return {
            message: 'تم حذف الكورس وجميع ملحقاته بنجاح',
        };
    }
    async unlockCourseWithCode(userId, rawCode) {
        const cleanCode = rawCode.trim().toUpperCase();
        const activationCode = await this.prisma.activationCode.findUnique({
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
            throw new common_1.NotFoundException('كود التفعيل غير صحيح أو غير موجود');
        }
        if (activationCode.isUsed) {
            throw new common_1.BadRequestException('هذا الكود مستخدم من قبل');
        }
        let targetCourseId = activationCode.courseId;
        if (activationCode.lessonId && activationCode.lesson) {
            targetCourseId = activationCode.lesson.chapter.courseId;
        }
        if (!targetCourseId) {
            throw new common_1.BadRequestException('كود التفعيل غير مقترن بكورس دراسي صالح');
        }
        const existing = await this.prisma.enrollment.findUnique({
            where: {
                userId_courseId: {
                    userId,
                    courseId: targetCourseId,
                },
            },
        });
        if (existing) {
            throw new common_1.ConflictException('أنت مشترك بالفعل في هذا الكورس');
        }
        const [enrollment] = await this.prisma.$transaction([
            this.prisma.enrollment.create({
                data: {
                    userId,
                    courseId: targetCourseId,
                },
            }),
            this.prisma.activationCode.update({
                where: { id: activationCode.id },
                data: {
                    isUsed: true,
                    usedById: userId,
                    usedAt: new Date(),
                },
            }),
        ]);
        const courseTitle = activationCode.course?.title ||
            activationCode.lesson?.chapter.course.title ||
            'الكورس';
        return {
            message: `تم بنجاح تفعيل واشتراك في: ${courseTitle}`,
            enrollment,
            courseId: targetCourseId,
        };
    }
    async ensureCourseExists(id) {
        const exists = await this.prisma.course.findUnique({ where: { id } });
        if (!exists) {
            throw new common_1.NotFoundException('الكورس المحدد غير موجود');
        }
        return exists;
    }
};
exports.CoursesService = CoursesService;
exports.CoursesService = CoursesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CoursesService);
//# sourceMappingURL=courses.service.js.map