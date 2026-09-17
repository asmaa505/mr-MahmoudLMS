import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { sendWhatsAppNotification, WhatsAppTemplates } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "STUDENT") {
      return NextResponse.json({ error: "غير مصرح لك بالوصول" }, { status: 401 });
    }

    const { quizId, answers } = await request.json();
    if (!quizId || !answers) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    // 1. Fetch Quiz with Questions and Chapter
    const quiz = await db.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: true,
        chapter: true,
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
    }

    // 2. Verify Student Enrollment in the Course
    const enrollment = await db.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: quiz.chapter.courseId,
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "غير مصرح: يجب الاشتراك وتفعيل الكورس أولاً لتقديم هذا الاختبار" },
        { status: 403 }
      );
    }

    // 2. Grade MCQ Questions
    const mcqQuestions = quiz.questions.filter((q) => q.type === "MCQ");
    let correctCount = 0;

    mcqQuestions.forEach((q) => {
      const studentAnswer = answers[q.id];
      if (studentAnswer !== undefined && Number(studentAnswer) === q.correctOption) {
        correctCount++;
      }
    });

    // Score is correct MCQ percentage (or 100% if no MCQs)
    const score = mcqQuestions.length > 0 ? (correctCount / mcqQuestions.length) * 100 : 100;

    // 3. Save Quiz Attempt
    const attempt = await db.quizAttempt.create({
      data: {
        userId: user.id,
        quizId: quiz.id,
        score,
        answers: JSON.stringify(answers),
        submittedAt: new Date(),
      },
    });

    // 4. Generate WhatsApp notification link & dispatch
    const waMessage = WhatsAppTemplates.quizGrade(user.name, quiz.title, Math.round(score), quiz.passingScore);
    const waResult = await sendWhatsAppNotification({
      phone: user.phone,
      message: waMessage,
      type: "QUIZ_GRADE",
    });

    return NextResponse.json({
      message: "تم تسليم الاختبار بنجاح",
      score,
      attemptId: attempt.id,
      questions: quiz.questions,
      whatsapp: waResult,
    });
  } catch (error: any) {
    console.error("Quiz Submission Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تصحيح الاختبار" }, { status: 550 });
  }
}
