import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';
import { AuthenticatedUser } from '../../common/interfaces/auth-payload.interface';
import { Role } from '../../common/enums/role.enum';
import { ERROR_CODES, REDIS_KEYS } from '../../common/constants';

@Injectable()
export class ExamsService {
  private readonly logger = new Logger(ExamsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Create an exam/quiz.
   */
  async createExam(dto: CreateExamDto) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: dto.chapterId },
    });

    if (!chapter) {
      throw new NotFoundException('الفصل الدراسي غير موجود');
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

  /**
   * Add a question to an exam.
   */
  async createQuestion(dto: CreateQuestionDto) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: dto.quizId },
    });

    if (!quiz) {
      throw new NotFoundException('الاختبار غير موجود');
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

    // Invalidate cached exam in Redis
    await this.redisService.getClient().del(`exam:cache:${dto.quizId}`);

    return {
      message: 'تم إضافة السؤال للاختبار بنجاح',
      question,
    };
  }

  /**
   * Fetch exam questions.
   * Strips correctOption and explanation for students to prevent client-side cheating!
   */
  async getExam(quizId: string, user: AuthenticatedUser) {
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
      throw new NotFoundException({
        message: 'الاختبار غير موجود',
        errorCode: ERROR_CODES.EXAM_NOT_FOUND,
      });
    }

    // Verify enrollment for students
    if (user.role === Role.STUDENT) {
      const enrollment = await this.prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId: quiz.chapter.courseId,
          },
        },
      });

      if (!enrollment) {
        throw new ForbiddenException({
          message: 'يجب الاشتراك في الكورس أولاً للوصول إلى هذا الاختبار.',
          errorCode: ERROR_CODES.COURSE_NOT_ENROLLED,
        });
      }
    }

    // Student view: Strip correct answers
    if (user.role === Role.STUDENT) {
      const sanitizedQuestions = quiz.questions.map((q: any) => {
        let parsedOptions: string[] = [];
        if (q.options) {
          try {
            parsedOptions = JSON.parse(q.options);
          } catch {
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
          // Intentionally omitting: correctOption, explanation
        };
      });

      // Check if student has already completed this quiz
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
              passed: (previousAttempt as any).passed ?? (previousAttempt.score >= quiz.passingScore),
              submittedAt: previousAttempt.submittedAt,
            }
          : null,
      };
    }

    // Admin/Teacher view: Full questions with answers
    return {
      ...quiz,
      questions: quiz.questions.map((q: any) => ({
        ...q,
        options: q.options ? JSON.parse(q.options) : [],
      })),
    };
  }

  /**
   * Submit exam with automated grading and Redis atomic locking to prevent race conditions during peak hours.
   */
  async submitExam(userId: string, dto: SubmitExamDto) {
    const lockKey = `${REDIS_KEYS.EXAM_SUBMISSION_LOCK_PREFIX}${userId}:${dto.quizId}`;

    // 1. Acquire Redis atomic distributed lock (5 seconds)
    const acquired = await this.redisService.acquireLock(lockKey, 5000);
    if (!acquired) {
      throw new ConflictException('يتم معالجة تسليم سابق للاختبار بالفعل. يرجى الانتظار.');
    }

    try {
      // 2. Fetch Quiz with Questions (Utilizing Redis cache to withstand 1000s of concurrent submissions)
      const cachedQuizJson = await this.redisService.getClient().get(`exam:cache:${dto.quizId}`);
      let quizData: any = null;

      if (cachedQuizJson) {
        try {
          quizData = JSON.parse(cachedQuizJson);
        } catch {
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
          throw new NotFoundException({
            message: 'الاختبار غير موجود',
            errorCode: ERROR_CODES.EXAM_NOT_FOUND,
          });
        }

        // Cache quiz structure in Redis for 10 minutes
        await this.redisService
          .getClient()
          .set(`exam:cache:${dto.quizId}`, JSON.stringify(quizData), 'EX', 600);
      }

      // 3. Verify enrollment
      const enrollment = await this.prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: quizData.chapter.courseId,
          },
        },
      });

      if (!enrollment) {
        throw new ForbiddenException({
          message: 'يجب تفعيل الكورس أولاً لتقديم الاختبار',
          errorCode: ERROR_CODES.COURSE_NOT_ENROLLED,
        });
      }

      // 4. Automated Grading Engine
      const questions: any[] = quizData.questions;
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

        let parsedOptions: string[] = [];
        if (q.options) {
          try {
            parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
          } catch {
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

      // Calculate final score percentage (0 - 100)
      const score = maxPossiblePoints > 0
        ? Math.round((totalEarnedPoints / maxPossiblePoints) * 100 * 10) / 10
        : 100;

      const passed = score >= (quizData.passingScore || 50);

      // 5. Save Quiz Attempt to database
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
    } finally {
      // Release Redis lock
      await this.redisService.releaseLock(lockKey);
    }
  }

  /**
   * Leaderboard for a quiz.
   */
  async getQuizLeaderboard(quizId: string) {
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
      passed: (attempt as any).passed ?? (attempt.score >= 50),
      submittedAt: attempt.submittedAt,
    }));
  }
}
