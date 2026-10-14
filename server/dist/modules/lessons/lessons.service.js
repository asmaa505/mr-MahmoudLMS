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
exports.LessonsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const role_enum_1 = require("../../common/enums/role.enum");
const constants_1 = require("../../common/constants");
let LessonsService = class LessonsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createChapter(dto) {
        const course = await this.prisma.course.findUnique({
            where: { id: dto.courseId },
        });
        if (!course) {
            throw new common_1.NotFoundException('الكورس المحدد غير موجود');
        }
        const chapter = await this.prisma.chapter.create({
            data: {
                title: dto.title.trim(),
                order: dto.order || 1,
                courseId: dto.courseId,
            },
        });
        return {
            message: 'تم إنشاء الفصل الدراسي بنجاح',
            chapter,
        };
    }
    async deleteChapter(chapterId) {
        const chapter = await this.prisma.chapter.findUnique({
            where: { id: chapterId },
        });
        if (!chapter) {
            throw new common_1.NotFoundException('الفصل المحدد غير موجود');
        }
        await this.prisma.chapter.delete({
            where: { id: chapterId },
        });
        return {
            message: 'تم حذف الفصل الدراسي بنجاح',
        };
    }
    get lessonModel() {
        return this.prisma.lesson || this.prisma.lecture;
    }
    async createLesson(dto) {
        const chapter = await this.prisma.chapter.findUnique({
            where: { id: dto.chapterId },
        });
        if (!chapter) {
            throw new common_1.NotFoundException('الفصل الدراسي المحدد غير موجود');
        }
        const lesson = await this.lessonModel.create({
            data: {
                title: dto.title.trim(),
                videoUrl: dto.videoUrl.trim(),
                duration: dto.duration?.trim() || '00:00',
                durationSeconds: dto.durationSeconds || 0,
                order: dto.order || 1,
                isFree: dto.isFree || false,
                chapterId: dto.chapterId,
            },
        });
        return {
            message: 'تم إنشاء المحاضرة بنجاح',
            lesson,
        };
    }
    async getLesson(lessonId, user) {
        const lesson = await this.lessonModel.findUnique({
            where: { id: lessonId },
            include: {
                chapter: {
                    include: {
                        course: true,
                    },
                },
            },
        });
        if (!lesson) {
            throw new common_1.NotFoundException('المحاضرة المحددة غير موجودة');
        }
        if (lesson.isFree) {
            return lesson;
        }
        if (user.role === role_enum_1.Role.ADMIN || user.role === role_enum_1.Role.TEACHER) {
            return lesson;
        }
        const enrollment = await this.prisma.enrollment.findUnique({
            where: {
                userId_courseId: {
                    userId: user.id,
                    courseId: lesson.chapter.courseId,
                },
            },
        });
        if (!enrollment) {
            throw new common_1.ForbiddenException({
                message: 'غير مصرح: يجب تفعيل واشتراك الكورس أولاً لمشاهدة هذا الدرس.',
                errorCode: constants_1.ERROR_CODES.COURSE_NOT_ENROLLED,
            });
        }
        return lesson;
    }
    async deleteLesson(lessonId) {
        const lesson = await this.lessonModel.findUnique({
            where: { id: lessonId },
        });
        if (!lesson) {
            throw new common_1.NotFoundException('المحاضرة المحددة غير موجودة');
        }
        await this.lessonModel.delete({
            where: { id: lessonId },
        });
        return {
            message: 'تم حذف المحاضرة بنجاح',
        };
    }
    async createHomework(dto) {
        const chapter = await this.prisma.chapter.findUnique({
            where: { id: dto.chapterId },
        });
        if (!chapter) {
            throw new common_1.NotFoundException('الفصل الدراسي المحدد غير موجود');
        }
        const homework = await this.prisma.homework.create({
            data: {
                title: dto.title.trim(),
                pdfUrl: dto.pdfUrl.trim(),
                chapterId: dto.chapterId,
            },
        });
        return {
            message: 'تم إضافة ملف الواجب بنجاح',
            homework,
        };
    }
    async deleteHomework(homeworkId) {
        const homework = await this.prisma.homework.findUnique({
            where: { id: homeworkId },
        });
        if (!homework) {
            throw new common_1.NotFoundException('ملف الواجب غير موجود');
        }
        await this.prisma.homework.delete({
            where: { id: homeworkId },
        });
        return {
            message: 'تم حذف ملف الواجب بنجاح',
        };
    }
};
exports.LessonsService = LessonsService;
exports.LessonsService = LessonsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LessonsService);
//# sourceMappingURL=lessons.service.js.map