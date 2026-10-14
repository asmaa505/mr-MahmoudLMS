import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TrackProgressDto } from './dto/track-progress.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  private get lessonModel(): any {
    return (this.prisma as any).lesson || (this.prisma as any).lecture;
  }

  private get lessonProgressModel(): any {
    return (this.prisma as any).lessonProgress;
  }

  /**
   * Upsert lesson watching progress and automatically calculate completion.
   */
  async trackProgress(userId: string, dto: TrackProgressDto) {
    const lesson = await this.lessonModel.findUnique({
      where: { id: dto.lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('المحاضرة غير موجودة');
    }

    const completionThreshold = 0.85; // 85% watched counts as completed
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

  /**
   * Student analytics dashboard: attendance, watch time, completion %, quiz results.
   */
  async getStudentDashboard(userId: string) {
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
      throw new NotFoundException('المستخدم غير موجود');
    }

    // Total lessons across all enrolled courses
    let totalEnrolledLessons = 0;
    enrollments.forEach((e: any) => {
      e.course.chapters.forEach((ch: any) => {
        const lessons = ch.lessons || ch.lectures || [];
        totalEnrolledLessons += lessons.length;
      });
    });

    const completedLessonsCount = (progressList as any[]).filter((p) => p.isCompleted).length;
    const totalWatchedSeconds = (progressList as any[]).reduce((sum, p) => sum + (p.watchedSeconds || 0), 0);

    const overallProgressPercent = totalEnrolledLessons > 0
      ? Math.round((completedLessonsCount / totalEnrolledLessons) * 100)
      : 0;

    // Exam statistics
    const totalExamsTaken = quizAttempts.length;
    const passedExamsCount = quizAttempts.filter((a: any) => a.passed ?? (a.score >= (a.quiz?.passingScore || 50))).length;
    const averageScore = totalExamsTaken > 0
      ? Math.round(
          quizAttempts.reduce((sum, a) => sum + a.score, 0) / totalExamsTaken,
        )
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
      recentExamAttempts: quizAttempts.slice(0, 10).map((a: any) => ({
        quizTitle: a.quiz.title,
        score: a.score,
        passed: a.passed ?? (a.score >= (a.quiz?.passingScore || 50)),
        submittedAt: a.submittedAt,
      })),
    };
  }

  /**
   * Teacher/Admin platform overview metrics.
   */
  async getTeacherDashboard() {
    const [totalStudents, pendingApprovals, blockedStudents, totalCourses, totalAttempts] =
      await Promise.all([
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
      recentSubmissions: recentAttempts.map((a: any) => ({
        studentName: a.user.name,
        studentPhone: a.user.phone,
        quizTitle: a.quiz.title,
        score: a.score,
        passed: a.passed ?? (a.score >= 50),
        submittedAt: a.submittedAt,
      })),
    };
  }

  /**
   * Calculate weekly progress report for a student based on subscription timeline.
   */
  async calculateStudentWeeklyReport(studentId: string, targetWeekNumber?: number) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: {
        lessonProgresses: true,
        quizAttempts: true,
      },
    });

    if (!student || student.role !== 'STUDENT') {
      throw new NotFoundException('حساب الطالب غير موجود');
    }

    const subscriptionStart = (student as any).subscriptionDate || student.createdAt;
    const now = new Date();
    const daysElapsed = Math.floor(
      Math.max(0, now.getTime() - subscriptionStart.getTime()) / (1000 * 60 * 60 * 24)
    );
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
    const progressList = ((student as any).lessonProgresses || []).filter((p: any) =>
      availableLessons.some((l: any) => l.id === (p.lessonId || p.lectureId))
    );

    const videosWatchedCount = progressList.filter((p: any) => p.isCompleted).length;
    const totalWatchedSeconds = progressList.reduce((sum: number, p: any) => sum + (p.watchedSeconds || 0), 0);
    const totalVideoSeconds = availableLessons.reduce((sum: number, l: any) => sum + (l.durationSeconds || 1800), 0);

    const averageWatchPercentage = totalVideoSeconds > 0
      ? Math.min(100, Math.round((totalWatchedSeconds / totalVideoSeconds) * 100))
      : 0;

    const weekAttempts = ((student as any).quizAttempts || []).filter((a: any) => {
      const d = a.submittedAt || a.startedAt;
      return d >= startDate && d <= endDate;
    });

    const examsTakenCount = weekAttempts.length;
    const totalExamScore = weekAttempts.reduce((sum: number, a: any) => sum + a.score, 0);
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

    if ((this.prisma as any).weeklyReport) {
      return (this.prisma as any).weeklyReport.upsert({
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

  /**
   * Cron Job batch runner: generates weekly reports for all enrolled students.
   */
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
}
