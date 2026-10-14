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
var ExamsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExamsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
const role_enum_1 = require("../../common/enums/role.enum");
const constants_1 = require("../../common/constants");
let ExamsService = ExamsService_1 = class ExamsService {
    prisma;
    redisService;
    logger = new common_1.Logger(ExamsService_1.name);
    constructor(prisma, redisService) {
        this.prisma = prisma;
        this.redisService = redisService;
    }
    async createExam(dto) {
        const chapter = await this.prisma.chapter.findUnique({
            where: { id: dto.chapterId },
        });
        if (!chapter) {
            throw new common_1.NotFoundException('الفصل الدراسي غير موجود');
        }
        const quiz = await this.prisma.quiz.create({
            data: {
                title: dto.title.trim(),
                duration: dto.duration,
                passingScore: dto.passingScore ?? 50,
                isMandatory: dto.isMandatory ?? true,
                chapterId: dto.chapterId,
            },
        });
        return {
            message: 'تم إنشاء الاختبار بنجاح',
            quiz,
        };
    }
    async createQuestion(dto) {
        const quiz = await this.prisma.quiz.findUnique({
            where: { id: dto.quizId },
        });
        if (!quiz) {
            throw new common_1.NotFoundException('الاختبار غير موجود');
        }
        const question = await this.prisma.question.create({
            data: {
                quizId: dto.quizId,
                text: dto.text.trim(),
                imageUrl: dto.imageUrl?.trim() || null,
                type: dto.type,
                options: dto.options ? JSON.stringify(dto.options) : null,
                correctOption: dto.correctOption !== undefined ? dto.correctOption : null,
                explanation: dto.explanation?.trim() || null,
                points: dto.points || 1,
                order: dto.order || 1,
            },
        });
        await this.redisService.getClient().del(`exam:cache:${dto.quizId}`);
        return {
            message: 'تم إضافة السؤال للاختبار بنجاح',
            question,
        };
    }
    async getExam(quizId, user) {
        const quiz = await this.prisma.quiz.findUnique({
            where: { id: quizId },
            include: {
                chapter: {
                    include: {
                        course: true,
                    },
                },
                questions: {
                    orderBy: { order: 'asc' },
                },
            },
        });
        if (!quiz) {
            throw new common_1.NotFoundException({
                message: 'الاختبار غير موجود',
                errorCode: constants_1.ERROR_CODES.EXAM_NOT_FOUND,
            });
        }
        if (user.role === role_enum_1.Role.STUDENT) {
            const enrollment = await this.prisma.enrollment.findUnique({
                where: {
                    userId_courseId: {
                        userId: user.id,
                        courseId: quiz.chapter.courseId,
                    },
                },
            });
            if (!enrollment) {
                throw new common_1.ForbiddenException({
                    message: 'يجب الاشتراك في الكورس أولاً للوصول إلى هذا الاختبار.',
                    errorCode: constants_1.ERROR_CODES.COURSE_NOT_ENROLLED,
                });
            }
        }
        if (user.role === role_enum_1.Role.STUDENT) {
            const sanitizedQuestions = quiz.questions.map((q) => {
                let parsedOptions = [];
                if (q.options) {
                    try {
                        parsedOptions = JSON.parse(q.options);
                    }
                    catch {
                        parsedOptions = [];
                    }
                }
                return {
                    id: q.id,
                    text: q.text,
                    imageUrl: q.imageUrl,
                    type: q.type,
                    options: parsedOptions,
                    points: q.points,
                    order: q.order,
                };
            });
            const previousAttempt = await this.prisma.quizAttempt.findFirst({
                where: { userId: user.id, quizId: quiz.id },
                orderBy: { submittedAt: 'desc' },
            });
            return {
                id: quiz.id,
                title: quiz.title,
                duration: quiz.duration,
                passingScore: quiz.passingScore,
                isMandatory: quiz.isMandatory,
                questionsCount: sanitizedQuestions.length,
                questions: sanitizedQuestions,
                previousAttempt: previousAttempt
                    ? {
                        score: previousAttempt.score,
                        passed: previousAttempt.passed ?? (previousAttempt.score >= quiz.passingScore),
                        submittedAt: previousAttempt.submittedAt,
                    }
                    : null,
            };
        }
        return {
            ...quiz,
            questions: quiz.questions.map((q) => ({
                ...q,
                options: q.options ? JSON.parse(q.options) : [],
            })),
        };
    }
    async submitExam(userId, dto) {
        const lockKey = `${constants_1.REDIS_KEYS.EXAM_SUBMISSION_LOCK_PREFIX}${userId}:${dto.quizId}`;
        const acquired = await this.redisService.acquireLock(lockKey, 5000);
        if (!acquired) {
            throw new common_1.ConflictException('يتم معالجة تسليم سابق للاختبار بالفعل. يرجى الانتظار.');
        }
        try {
            const cachedQuizJson = await this.redisService.getClient().get(`exam:cache:${dto.quizId}`);
            let quizData = null;
            if (cachedQuizJson) {
                try {
                    quizData = JSON.parse(cachedQuizJson);
                }
                catch {
                    quizData = null;
                }
            }
            if (!quizData) {
                quizData = await this.prisma.quiz.findUnique({
                    where: { id: dto.quizId },
                    include: {
                        questions: true,
                        chapter: true,
                    },
                });
                if (!quizData) {
                    throw new common_1.NotFoundException({
                        message: 'الاختبار غير موجود',
                        errorCode: constants_1.ERROR_CODES.EXAM_NOT_FOUND,
                    });
                }
                await this.redisService
                    .getClient()
                    .set(`exam:cache:${dto.quizId}`, JSON.stringify(quizData), 'EX', 600);
            }
            const enrollment = await this.prisma.enrollment.findUnique({
                where: {
                    userId_courseId: {
                        userId,
                        courseId: quizData.chapter.courseId,
                    },
                },
            });
            if (!enrollment) {
                throw new common_1.ForbiddenException({
                    message: 'يجب تفعيل الكورس أولاً لتقديم الاختبار',
                    errorCode: constants_1.ERROR_CODES.COURSE_NOT_ENROLLED,
                });
            }
            const questions = quizData.questions;
            let totalEarnedPoints = 0;
            let maxPossiblePoints = 0;
            let correctAnswersCount = 0;
            const review = questions.map((q) => {
                const studentAns = dto.answers[q.id];
                const isMcq = q.type === 'MCQ';
                let isCorrect = false;
                const points = q.points || 1;
                maxPossiblePoints += points;
                if (isMcq && studentAns !== undefined) {
                    if (Number(studentAns) === q.correctOption) {
                        isCorrect = true;
                        correctAnswersCount++;
                        totalEarnedPoints += points;
                    }
                }
                let parsedOptions = [];
                if (q.options) {
                    try {
                        parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
                    }
                    catch {
                        parsedOptions = [];
                    }
                }
                return {
                    questionId: q.id,
                    text: q.text,
                    imageUrl: q.imageUrl,
                    options: parsedOptions,
                    studentAnswer: studentAns !== undefined ? Number(studentAns) : null,
                    correctOption: q.correctOption,
                    isCorrect,
                    explanation: q.explanation,
                };
            });
            const score = maxPossiblePoints > 0
                ? Math.round((totalEarnedPoints / maxPossiblePoints) * 100 * 10) / 10
                : 100;
            const passed = score >= (quizData.passingScore || 50);
            const attempt = await this.prisma.quizAttempt.create({
                data: {
                    userId,
                    quizId: quizData.id,
                    score,
                    answers: JSON.stringify(dto.answers),
                    submittedAt: new Date(),
                },
            });
            return {
                message: 'تم تسليم الاختبار وتصحيحه بنجاح',
                attemptId: attempt.id,
                score,
                passed,
                passingScore: quizData.passingScore,
                totalQuestions: questions.length,
                correctAnswersCount,
                review,
            };
        }
        finally {
            await this.redisService.releaseLock(lockKey);
        }
    }
    async getQuizLeaderboard(quizId) {
        const attempts = await this.prisma.quizAttempt.findMany({
            where: { quizId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        grade: true,
                    },
                },
            },
            orderBy: [{ score: 'desc' }, { submittedAt: 'asc' }],
            take: 50,
        });
        return attempts.map((attempt, index) => ({
            rank: index + 1,
            studentName: attempt.user.name,
            score: attempt.score,
            passed: attempt.passed ?? (attempt.score >= 50),
            submittedAt: attempt.submittedAt,
        }));
    }
};
exports.ExamsService = ExamsService;
exports.ExamsService = ExamsService = ExamsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], ExamsService);
//# sourceMappingURL=exams.service.js.map