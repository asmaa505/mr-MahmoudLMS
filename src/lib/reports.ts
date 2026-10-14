import { db } from "@/lib/db";
import { formatEgyptianPhone } from "@/lib/whatsapp";

export interface StudentWeeklySummary {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  videosWatchedCount: number;
  totalVideosAvailable: number;
  averageWatchPercentage: number;
  examsTakenCount: number;
  averageExamScore: number;
  status: string;
  summaryText: string;
}

/**
 * Record or update video playback progress for a student.
 */
export async function recordVideoProgress(
  userId: string,
  lectureId: string,
  currentTime: number,
  duration: number,
  isFinished = false
) {
  if (!userId || !lectureId) return null;

  const validDuration = Math.max(0, duration);
  const validCurrentTime = Math.max(0, currentTime);
  const calculatedPercentage =
    validDuration > 0
      ? Math.min(100, Math.round((validCurrentTime / validDuration) * 100))
      : 0;

  const existing = await db.lessonProgress.findUnique({
    where: {
      userId_lectureId: {
        userId,
        lectureId,
      },
    },
  });

  const shouldMarkCompleted =
    isFinished || calculatedPercentage >= 80 || (existing?.isCompleted ?? false);

  const highestWatched = Math.max(
    existing?.watchedSeconds || 0,
    Math.round(validCurrentTime)
  );

  const highestPercentage = Math.max(
    existing?.watchPercentage || 0,
    calculatedPercentage
  );

  return db.lessonProgress.upsert({
    where: {
      userId_lectureId: {
        userId,
        lectureId,
      },
    },
    create: {
      userId,
      lectureId,
      watchedSeconds: Math.round(validCurrentTime),
      totalSeconds: Math.round(validDuration),
      watchPercentage: calculatedPercentage,
      isCompleted: shouldMarkCompleted,
      lastPosition: validCurrentTime,
      completedAt: shouldMarkCompleted ? new Date() : null,
    },
    update: {
      watchedSeconds: highestWatched,
      totalSeconds: Math.round(validDuration) || existing?.totalSeconds || 0,
      watchPercentage: highestPercentage,
      isCompleted: shouldMarkCompleted,
      lastPosition: validCurrentTime,
      completedAt:
        shouldMarkCompleted && !existing?.isCompleted
          ? new Date()
          : existing?.completedAt,
    },
  });
}

/**
 * Helper to get Arabic grade title.
 */
export function getGradeLabel(grade: string): string {
  if (grade === "1") return "الصف الأول الثانوي";
  if (grade === "2") return "الصف الثاني الثانوي";
  return "الصف الثالث الثانوي";
}

/**
 * Format a Date to Arabic human-readable format (DD/MM/YYYY).
 */
export function formatDateArabic(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Determine evaluation badge and personalized advice for report.
 */
function getEvaluationAndAdvice(
  watchPercentage: number,
  examScore: number,
  examsCount: number
) {
  if (watchPercentage >= 85 && (examScore >= 80 || examsCount === 0)) {
    return {
      rating: "ممتاز 🌟 (مستوى فائق والتزام تام)",
      advice:
        "الطالب يبدي تفانياً والتزاماً متميزاً في متابعة شروحات الفيزياء وحل الواجبات. نرجو الاستمرار على هذا المستوى المشرف لتحقيق الدرجات النهائية بإذن الله.",
    };
  }

  if (watchPercentage >= 65 && examScore >= 65) {
    return {
      rating: "جيد جداً 👍 (أداء طيب مع إمكانية تحسن أكبر)",
      advice:
        "مستوى الطالب جيد ومبشر، ونوصي بالتركيز الإضافي على مراجعة المسائل الصعبة وإعادة حل الاختبارات السابقة لتعزيز الفهم العميق.",
    };
  }

  if (watchPercentage >= 50 || examScore >= 50) {
    return {
      rating: "مقبول ⚠️ (يحتاج إلى متابعة واهتمام مكثف)",
      advice:
        "يُرجى من ولي الأمر حث الطالب على الانتظام في استكمال مشاهدة المحاضرات أولاً بأول وحل الاختبارات فور نشرها لعدم تراكم المنهج.",
    };
  }

  return {
    rating: "تنبيه هام 🚨 (انخفاض ملحوظ في الحضور والمذاكرة)",
    advice:
      "نلفت عناية ولي الأمر الكريمة إلى وجود تقصير كبير في مشاهدة المحاضرات وحضور الاختبارات. يُرجى التواصل العاجل مع الأستاذ محمود الشحات لمعالجة التقصير.",
  };
}

/**
 * Calculate and save weekly progress report for a student for a specific week number.
 */
export async function calculateStudentWeeklyReport(
  studentId: string,
  targetWeekNumber?: number
) {
  const student = await db.user.findUnique({
    where: { id: studentId },
    include: {
      lessonProgress: {
        include: { lecture: true },
      },
      quizAttempts: {
        include: { quiz: true },
      },
    },
  });

  if (!student || student.role === "ADMIN") return null;

  // Subscription start date (defaults to subscriptionDate or createdAt)
  const subscriptionStart = student.subscriptionDate || student.createdAt;
  const now = new Date();
  const msElapsed = Math.max(0, now.getTime() - subscriptionStart.getTime());
  const daysElapsed = Math.floor(msElapsed / (1000 * 60 * 60 * 24));
  const currentWeekNumber = Math.max(1, Math.floor(daysElapsed / 7) + 1);

  const weekNumber = targetWeekNumber || currentWeekNumber;

  // Calculate start & end bounds of the 7-day period
  const startDate = new Date(
    subscriptionStart.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000
  );
  const endDate = new Date(
    subscriptionStart.getTime() + weekNumber * 7 * 24 * 60 * 60 * 1000
  );

  // Fetch all lectures available for this student's grade
  const availableLectures = await db.lecture.findMany({
    where: {
      chapter: {
        course: {
          grade: student.grade,
          isPublished: true,
        },
      },
      createdAt: {
        lte: endDate,
      },
    },
    include: {
      chapter: {
        include: { course: true },
      },
    },
  });

  const totalVideosAvailable = availableLectures.length;

  // Filter student watch progress up to this week
  const progressRecords = student.lessonProgress.filter((p) => {
    return availableLectures.some((l) => l.id === p.lectureId);
  });

  const videosWatchedCount = progressRecords.filter((p) => p.isCompleted).length;

  let totalPercentage = 0;
  if (totalVideosAvailable > 0) {
    progressRecords.forEach((p) => {
      totalPercentage += p.watchPercentage;
    });
  }

  const averageWatchPercentage =
    totalVideosAvailable > 0
      ? Math.min(100, Math.round(totalPercentage / totalVideosAvailable))
      : 0;

  // Filter quiz attempts during this week window
  const weekAttempts = student.quizAttempts.filter((a) => {
    const attemptDate = a.submittedAt || a.startedAt;
    return attemptDate >= startDate && attemptDate <= endDate;
  });

  const examsTakenCount = weekAttempts.length;
  const totalScore = weekAttempts.reduce((acc, curr) => acc + curr.score, 0);
  const averageExamScore =
    examsTakenCount > 0 ? Math.round(totalScore / examsTakenCount) : 0;

  const { rating, advice } = getEvaluationAndAdvice(
    averageWatchPercentage,
    averageExamScore,
    examsTakenCount
  );

  // Compose formatted Arabic report text for WhatsApp and SMS
  const summaryText = `*تقرير المتابعة الأسبوعي - منصة الفيزياء ⚛️*
الأستاذ: محمود الشحات
━━━━━━━━━━━━━━━━━━
👤 *الطالب/ة:* ${student.name}
📚 *المرحلة:* ${getGradeLabel(student.grade)}
📅 *تقرير الأسبوع رقم:* (${weekNumber})
🗓️ *الفترة:* من ${formatDateArabic(startDate)} إلى ${formatDateArabic(endDate)}
━━━━━━━━━━━━━━━━━━
🎥 *نسبة مشاهدة المحاضرات:* ${averageWatchPercentage}%
📊 *المحاضرات المكتملة:* ${videosWatchedCount} من إجمالي ${totalVideosAvailable} محاضرة
📝 *عدد الاختبارات المنجزة:* ${examsTakenCount} اختبار
🎯 *متوسط درجات الاختبارات:* ${examsTakenCount > 0 ? `${averageExamScore}%` : "لم يؤدِ اختبارات هذا الأسبوع"}

🏆 *التقييم العام للمستوى:*
${rating}

━━━━━━━━━━━━━━━━━━
💬 *توجيه الأستاذ محمود الشحات:*
${advice}
━━━━━━━━━━━━━━━━━━
منصة الأستاذ محمود الشحات للفيزياء للثانوية العامة 🔬`;

  // Upsert weekly report in database
  const report = await db.weeklyReport.upsert({
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
      status: "READY",
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

  return report;
}

/**
 * Generate all weekly reports up to current week for a single student.
 */
export async function generateAllReportsForStudent(studentId: string) {
  const student = await db.user.findUnique({
    where: { id: studentId },
    select: { subscriptionDate: true, createdAt: true, role: true },
  });

  if (!student || student.role === "ADMIN") return [];

  const subscriptionStart = student.subscriptionDate || student.createdAt;
  const now = new Date();
  const msElapsed = Math.max(0, now.getTime() - subscriptionStart.getTime());
  const daysElapsed = Math.floor(msElapsed / (1000 * 60 * 60 * 24));
  const currentWeekNumber = Math.max(1, Math.floor(daysElapsed / 7) + 1);

  const results = [];
  for (let w = 1; w <= currentWeekNumber; w++) {
    const report = await calculateStudentWeeklyReport(studentId, w);
    if (report) results.push(report);
  }

  return results;
}

/**
 * Generate weekly reports for all approved students (cron/background batch).
 */
export async function generateAllStudentsWeeklyReports() {
  const students = await db.user.findMany({
    where: {
      role: "STUDENT",
      isApproved: true,
      isBlocked: false,
    },
    select: { id: true },
  });

  let generatedCount = 0;
  for (const student of students) {
    await generateAllReportsForStudent(student.id);
    generatedCount++;
  }

  return {
    success: true,
    totalStudentsProcessed: generatedCount,
  };
}

/**
 * Generate WhatsApp direct share link for a student or parent.
 */
export function getReportWhatsAppLink(phone: string, summaryText: string): string {
  const cleanPhone = formatEgyptianPhone(phone);
  const encodedText = encodeURIComponent(summaryText);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}
