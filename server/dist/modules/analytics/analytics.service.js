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
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
let AnalyticsService = class AnalyticsService {
    prisma;
    redisService;
    constructor(prisma, redisService) {
        this.prisma = prisma;
        this.redisService = redisService;
    }
    get lessonModel() {
        return this.prisma.lesson || this.prisma.lecture;
    }
    get lessonProgressModel() {
        return this.prisma.lessonProgress;
    }
    async trackProgress(userId, dto) {
        const lesson = await this.lessonModel.findUnique({
            where: { id: dto.lessonId },
        });
        if (!lesson) {
            throw new common_1.NotFoundException('المحاضرة غير موجودة');
        }
        const completionThreshold = 0.85;
        const watchedFraction = dto.watchedSeconds / dto.totalSeconds;
        const isCompleted = dto.isCompleted || watchedFraction >= completionThreshold;
        if (!this.lessonProgressModel) {
            return {
                message: 'تم تسجيل تقدم المشاهدة',
                isCompleted,
                progressPercent: Math.min(100, Math.round(watchedFraction * 100)),
            };
        }
        const record = await this.lessonProgressModel.upsert({
            where: {
                userId_lessonId: {
                    userId,
                    lessonId: dto.lessonId,
                },
            },
            update: {
                watchedSeconds: dto.watchedSeconds,
                totalSeconds: dto.totalSeconds,
                isCompleted: isCompleted,
                lastWatchedAt: new Date(),
            },
            create: {
                userId,
                lessonId: dto.lessonId,
                watchedSeconds: dto.watchedSeconds,
                totalSeconds: dto.totalSeconds,
                isCompleted: isCompleted,
                lastWatchedAt: new Date(),
            },
        });
        return {
            message: 'تم حفظ تقدم المشاهدة',
            isCompleted: record.isCompleted,
            progressPercent: Math.min(100, Math.round(watchedFraction * 100)),
        };
    }
    async getStudentDashboard(userId) {
        const [user, enrollments, progressList, quizAttempts] = await Promise.all([
            this.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, name: true, phone: true, grade: true, createdAt: true },
            }),
            this.prisma.enrollment.findMany({
                where: { userId },
                include: {
                    course: {
                        include: {
                            chapters: {
                                include: {
                                    lessons: { select: { id: true } },
                                },
                            },
                        },
                    },
                },
            }),
            this.lessonProgressModel
                ? this.lessonProgressModel.findMany({ where: { userId } })
                : Promise.resolve([]),
            this.prisma.quizAttempt.findMany({
                where: { userId },
                include: {
                    quiz: {
                        select: { id: true, title: true, passingScore: true },
                    },
                },
                orderBy: { submittedAt: 'desc' },
            }),
        ]);
        if (!user) {
            throw new common_1.NotFoundException('المستخدم غير موجود');
        }
        let totalEnrolledLessons = 0;
        enrollments.forEach((e) => {
            e.course.chapters.forEach((ch) => {
                const lessons = ch.lessons || ch.lectures || [];
                totalEnrolledLessons += lessons.length;
            });
        });
        const completedLessonsCount = progressList.filter((p) => p.isCompleted).length;
        const totalWatchedSeconds = progressList.reduce((sum, p) => sum + (p.watchedSeconds || 0), 0);
        const overallProgressPercent = totalEnrolledLessons > 0
            ? Math.round((completedLessonsCount / totalEnrolledLessons) * 100)
            : 0;
        const totalExamsTaken = quizAttempts.length;
        const passedExamsCount = quizAttempts.filter((a) => a.passed ?? (a.score >= (a.quiz?.passingScore || 50))).length;
        const averageScore = totalExamsTaken > 0
            ? Math.round(quizAttempts.reduce((sum, a) => sum + a.score, 0) / totalExamsTaken)
            : 0;
        return {
            student: user,
            overview: {
                enrolledCoursesCount: enrollments.length,
                totalEnrolledLessons,
                completedLessonsCount,
                overallProgressPercent,
                totalWatchedHours: (totalWatchedSeconds / 3600).toFixed(1),
                totalExamsTaken,
                passedExamsCount,
                averageExamScore: averageScore,
            },
            recentExamAttempts: quizAttempts.slice(0, 10).map((a) => ({
                quizTitle: a.quiz.title,
                score: a.score,
                passed: a.passed ?? (a.score >= (a.quiz?.passingScore || 50)),
                submittedAt: a.submittedAt,
            })),
        };
    }
    async getTeacherDashboard() {
        const [totalStudents, pendingApprovals, blockedStudents, totalCourses, totalAttempts] = await Promise.all([
            this.prisma.user.count({ where: { role: 'STUDENT' } }),
            this.prisma.user.count({ where: { role: 'STUDENT', isApproved: false } }),
            this.prisma.user.count({ where: { role: 'STUDENT', isBlocked: true } }),
            this.prisma.course.count(),
            this.prisma.quizAttempt.count(),
        ]);
        const recentAttempts = await this.prisma.quizAttempt.findMany({
            take: 10,
            orderBy: { submittedAt: 'desc' },
            include: {
                user: { select: { id: true, name: true, phone: true } },
                quiz: { select: { id: true, title: true } },
            },
        });
        return {
            metrics: {
                totalStudents,
                pendingApprovals,
                blockedStudents,
                activeStudents: totalStudents - blockedStudents - pendingApprovals,
                totalCourses,
                totalExamAttempts: totalAttempts,
            },
            recentSubmissions: recentAttempts.map((a) => ({
                studentName: a.user.name,
                studentPhone: a.user.phone,
                quizTitle: a.quiz.title,
                score: a.score,
                passed: a.passed ?? (a.score >= 50),
                submittedAt: a.submittedAt,
            })),
        };
    }
    async calculateStudentWeeklyReport(studentId, targetWeekNumber) {
        const student = await this.prisma.user.findUnique({
            where: { id: studentId },
            include: {
                lessonProgresses: true,
                quizAttempts: true,
            },
        });
        if (!student || student.role !== 'STUDENT') {
            throw new common_1.NotFoundException('حساب الطالب غير موجود');
        }
        const subscriptionStart = student.subscriptionDate || student.createdAt;
        const now = new Date();
        const daysElapsed = Math.floor(Math.max(0, now.getTime() - subscriptionStart.getTime()) / (1000 * 60 * 60 * 24));
        const currentWeekNumber = Math.max(1, Math.floor(daysElapsed / 7) + 1);
        const weekNumber = targetWeekNumber || currentWeekNumber;
        const startDate = new Date(subscriptionStart.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000);
        const endDate = new Date(subscriptionStart.getTime() + weekNumber * 7 * 24 * 60 * 60 * 1000);
        const availableLessons = await this.lessonModel.findMany({
            where: {
                chapter: {
                    course: { grade: student.grade, isPublished: true },
                },
                createdAt: { lte: endDate },
            },
        });
        const totalVideosAvailable = availableLessons.length;
        const progressList = (student.lessonProgresses || []).filter((p) => availableLessons.some((l) => l.id === (p.lessonId || p.lectureId)));
        const videosWatchedCount = progressList.filter((p) => p.isCompleted).length;
        const totalWatchedSeconds = progressList.reduce((sum, p) => sum + (p.watchedSeconds || 0), 0);
        const totalVideoSeconds = availableLessons.reduce((sum, l) => sum + (l.durationSeconds || 1800), 0);
        const averageWatchPercentage = totalVideoSeconds > 0
            ? Math.min(100, Math.round((totalWatchedSeconds / totalVideoSeconds) * 100))
            : 0;
        const weekAttempts = (student.quizAttempts || []).filter((a) => {
            const d = a.submittedAt || a.startedAt;
            return d >= startDate && d <= endDate;
        });
        const examsTakenCount = weekAttempts.length;
        const totalExamScore = weekAttempts.reduce((sum, a) => sum + a.score, 0);
        const averageExamScore = examsTakenCount > 0 ? Math.round(totalExamScore / examsTakenCount) : 0;
        const summaryText = `*تقرير المتابعة الأسبوعي - منصة الفيزياء ⚛️*
الأستاذ: محمود الشحات
━━━━━━━━━━━━━━━━━━
👤 *الطالب/ة:* ${student.name}
📚 *المرحلة:* ${student.grade === '1' ? 'أولى ثانوي' : student.grade === '2' ? 'ثانية ثانوي' : 'ثالثة ثانوي'}
📅 *تقرير الأسبوع رقم:* (${weekNumber})
🗓️ *الفترة:* من ${startDate.toLocaleDateString('ar-EG')} إلى ${endDate.toLocaleDateString('ar-EG')}
━━━━━━━━━━━━━━━━━━
🎥 *نسبة مشاهدة المحاضرات:* ${averageWatchPercentage}%
📊 *المحاضرات المكتملة:* ${videosWatchedCount} من ${totalVideosAvailable} محاضرة
📝 *الاختبارات المنجزة:* ${examsTakenCount} اختبار
🎯 *متوسط درجات الاختبارات:* ${examsTakenCount > 0 ? `${averageExamScore}%` : 'لا يوجد اختبارات هذا الأسبوع'}
━━━━━━━━━━━━━━━━━━
منصة الأستاذ محمود الشحات للفيزياء للثانوية العامة 🔬`;
        if (this.prisma.weeklyReport) {
            return this.prisma.weeklyReport.upsert({
                where: {
                    userId_weekNumber: {
                        userId: studentId,
                        weekNumber,
                    },
                },
                create: {
                    userId: studentId,
                    weekNumber,
                    startDate,
                    endDate,
                    videosWatchedCount,
                    totalVideosAvailable,
                    averageWatchPercentage,
                    examsTakenCount,
                    averageExamScore,
                    status: 'READY',
                    summaryText,
                },
                update: {
                    startDate,
                    endDate,
                    videosWatchedCount,
                    totalVideosAvailable,
                    averageWatchPercentage,
                    examsTakenCount,
                    averageExamScore,
                    summaryText,
                    updatedAt: new Date(),
                },
            });
        }
        return {
            studentId,
            weekNumber,
            startDate,
            endDate,
            videosWatchedCount,
            totalVideosAvailable,
            averageWatchPercentage,
            examsTakenCount,
            averageExamScore,
            summaryText,
        };
    }
    async generateWeeklyReportsBatch() {
        const students = await this.prisma.user.findMany({
            where: { role: 'STUDENT', isApproved: true, isBlocked: false },
            select: { id: true },
        });
        let processed = 0;
        for (const s of students) {
            await this.calculateStudentWeeklyReport(s.id);
            processed++;
        }
        return {
            message: 'تم توليد وتحديث التقارير الأسبوعية بنجاح',
            totalStudents: processed,
        };
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map