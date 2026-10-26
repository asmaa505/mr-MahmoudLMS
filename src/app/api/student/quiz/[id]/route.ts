import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizAccessMiddleware, sanitizeQuizForUser } from "@/lib/quiz-lock";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const quizId = params?.id;

    if (!quizId) {
      return NextResponse.json({ error: "معرف الاختبار مطلوب" }, { status: 400 });
    }

    // 1. Backend middleware: inspect prerequisite completion before returning quiz content
    const authOrResponse = await quizAccessMiddleware(request, quizId);
    if (authOrResponse instanceof NextResponse) {
      return authOrResponse;
    }

    const { user, quiz } = authOrResponse;

    // 2. Fetch student's past attempts
    const pastAttempts = await db.quizAttempt.findMany({
      where: {
        userId: user.id,
        quizId: quiz.id,
      },
      orderBy: { submittedAt: "desc" },
    });

    // 3. Prepare sanitized payload protecting academic integrity
    const payload = sanitizeQuizForUser(quiz, user.role, pastAttempts);

    return NextResponse.json(payload, { status: 200 });
  } catch (error: any) {
    console.error("Quiz Content Retrieval Error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء استرجاع بيانات الاختبار" },
      { status: 500 }
    );
  }
}
