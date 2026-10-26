import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser, verifyToken } from "@/lib/auth";

export interface PrerequisiteInspectionResult {
  allowed: boolean;
  status: number;
  reason?: string;
  code?: string;
  quiz?: any;
  lockedBy?: {
    type: "LECTURE" | "QUIZ" | "ENROLLMENT";
    id?: string;
    title?: string;
  };
}

/**
 * Extracts and authenticates user from active session cookie or Authorization header.
 */
export async function authenticateRequest(
  request?: NextRequest
): Promise<{ id: string; role: string; name: string; phone?: string } | null> {
  // 1. Try getAuthUser() (reads cookies via next/headers)
  try {
    const user = await getAuthUser();
    if (user) {
      return { id: user.id, role: user.role, name: user.name, phone: user.phone };
    }
  } catch {
    // next/headers might throw or be unavailable in some isolated testing environments
  }

  if (!request) return null;

  // 2. Try cookie header on incoming NextRequest
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(/auth_token=([^;]+)/);
    if (match && match[1]) {
      const decoded = verifyToken(match[1]);
      if (decoded && decoded.userId) {
        return {
          id: decoded.userId,
          role: decoded.role || "STUDENT",
          name: decoded.name || "",
          phone: decoded.phone,
        };
      }
    }
  }

  // 3. Try Authorization: Bearer <token>
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    const decoded = verifyToken(token);
    if (decoded && decoded.userId) {
      return {
        id: decoded.userId,
        role: decoded.role || "STUDENT",
        name: decoded.name || "",
        phone: decoded.phone,
      };
    }
  }

  return null;
}

/**
 * Server-side validation of mandatory quiz access rules and prerequisites.
 * Ensures students cannot bypass prerequisites through client-side manipulation.
 */
export async function inspectQuizPrerequisites(
  userId: string,
  quizId: string,
  userRole = "STUDENT"
): Promise<PrerequisiteInspectionResult> {
  // 1. Fetch Quiz with Chapter, Course, and Chapter curriculum hierarchy
  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    include: {
      chapter: {
        include: {
          lectures: { orderBy: { order: "asc" } },
          quizzes: { orderBy: { createdAt: "asc" } },
          course: {
            include: {
              chapters: {
                orderBy: { order: "asc" },
                include: {
                  lectures: { orderBy: { order: "asc" } },
                  quizzes: { orderBy: { createdAt: "asc" } },
                },
              },
            },
          },
        },
      },
      questions: true,
    },
  });

  if (!quiz) {
    return {
      allowed: false,
      status: 404,
      reason: "الاختبار غير موجود",
      code: "QUIZ_NOT_FOUND",
    };
  }

  // 2. Admins and Teachers have full bypass permissions
  if (userRole === "ADMIN" || userRole === "TEACHER") {
    return {
      allowed: true,
      status: 200,
      quiz,
    };
  }

  // 3. Verify Course Enrollment
  const enrollment = await db.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId: quiz.chapter.courseId,
      },
    },
  });

  if (!enrollment) {
    return {
      allowed: false,
      status: 403,
      reason: "غير مصرح: يجب الاشتراك وتفعيل الكورس أولاً للوصول إلى هذا الاختبار",
      code: "NOT_ENROLLED",
      quiz,
      lockedBy: {
        type: "ENROLLMENT",
      },
    };
  }

  const allChapters = quiz.chapter.course.chapters || [];
  const currentChapterOrder = quiz.chapter.order;

  // 4. Validate Mandatory Quizzes in Preceding Chapters
  // If an earlier chapter in the course has a mandatory quiz, the student must pass it first.
  const precedingChapters = allChapters.filter((ch) => ch.order < currentChapterOrder);
  const precedingMandatoryQuizzes = precedingChapters.flatMap((ch) =>
    ch.quizzes.filter((q) => q.isMandatory)
  );

  if (precedingMandatoryQuizzes.length > 0) {
    const attempts = await db.quizAttempt.findMany({
      where: {
        userId,
        quizId: { in: precedingMandatoryQuizzes.map((q) => q.id) },
      },
    });

    for (const prevQuiz of precedingMandatoryQuizzes) {
      const isPassed = attempts.some(
        (att) => att.quizId === prevQuiz.id && att.score >= prevQuiz.passingScore
      );

      if (!isPassed) {
        return {
          allowed: false,
          status: 403,
          reason: `غير مصرح: يجب أولاً اجتياز اختبار الفصل السابق (${prevQuiz.title}) بدرجة لا تقل عن %${prevQuiz.passingScore}`,
          code: "PREVIOUS_MANDATORY_QUIZ_NOT_PASSED",
          quiz,
          lockedBy: {
            type: "QUIZ",
            id: prevQuiz.id,
            title: prevQuiz.title,
          },
        };
      }
    }
  }

  // 5. Validate Preceding Mandatory Quizzes within the SAME Chapter (if multiple quizzes exist)
  const sameChapterQuizzes = quiz.chapter.quizzes || [];
  const earlierQuizzesInChapter = sameChapterQuizzes.filter(
    (q) => q.id !== quiz.id && q.createdAt < quiz.createdAt && q.isMandatory
  );

  if (earlierQuizzesInChapter.length > 0) {
    const attempts = await db.quizAttempt.findMany({
      where: {
        userId,
        quizId: { in: earlierQuizzesInChapter.map((q) => q.id) },
      },
    });

    for (const earlierQuiz of earlierQuizzesInChapter) {
      const isPassed = attempts.some(
        (att) => att.quizId === earlierQuiz.id && att.score >= earlierQuiz.passingScore
      );

      if (!isPassed) {
        return {
          allowed: false,
          status: 403,
          reason: `غير مصرح: يجب أولاً اجتياز الاختبار السابق (${earlierQuiz.title}) بدرجة لا تقل عن %${earlierQuiz.passingScore}`,
          code: "SAME_CHAPTER_QUIZ_NOT_PASSED",
          quiz,
          lockedBy: {
            type: "QUIZ",
            id: earlierQuiz.id,
            title: earlierQuiz.title,
          },
        };
      }
    }
  }

  // 6. Validate Prerequisite Lecture Completion in the Current Chapter
  // In the chapter progression, students must complete the introductory prerequisite lecture
  // (the first lecture of the chapter) before quiz content is unlocked.
  const currentChapterLectures = quiz.chapter.lectures || [];
  if (currentChapterLectures.length > 0) {
    const prerequisiteLecture = currentChapterLectures[0];
    const progress = await db.lessonProgress.findUnique({
      where: {
        userId_lectureId: {
          userId,
          lectureId: prerequisiteLecture.id,
        },
      },
    });

    const isLectureCompleted =
      Boolean(progress?.isCompleted) || (progress?.watchPercentage ?? 0) >= 80;

    if (!isLectureCompleted) {
      return {
        allowed: false,
        status: 403,
        reason: `غير مصرح: يجب مشاهدة المحاضرة التمهيدية (${prerequisiteLecture.title}) وإكمالها أولاً قبل بدء الاختبار`,
        code: "PREREQUISITE_LECTURE_NOT_COMPLETED",
        quiz,
        lockedBy: {
          type: "LECTURE",
          id: prerequisiteLecture.id,
          title: prerequisiteLecture.title,
        },
      };
    }
  }

  // All prerequisites verified
  return {
    allowed: true,
    status: 200,
    quiz,
  };
}

/**
 * Backend middleware that inspects prerequisite completion before returning quiz content.
 * Rejects unauthorized or locked requests with a 403 Forbidden status code.
 */
export async function quizAccessMiddleware(
  request: NextRequest,
  quizId: string
): Promise<{ user: any; quiz: any } | NextResponse> {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "غير مصرح: يرجى تسجيل الدخول أولاً للوصول إلى الاختبار" },
      { status: 401 }
    );
  }

  const inspection = await inspectQuizPrerequisites(user.id, quizId, user.role);

  if (!inspection.allowed) {
    return NextResponse.json(
      {
        error: inspection.reason,
        code: inspection.code,
        locked: true,
        lockedBy: inspection.lockedBy,
      },
      { status: inspection.status }
    );
  }

  return { user, quiz: inspection.quiz };
}

/**
 * Helper to prepare sanitized quiz payload.
 * Strips correctOption and explanation for students to ensure academic integrity.
 */
export function sanitizeQuizForUser(quiz: any, userRole: string, pastAttempts: any[] = []) {
  const isStudent = userRole === "STUDENT";

  const sanitizedQuestions = (quiz.questions || []).map((q: any) => ({
    id: q.id,
    quizId: q.quizId,
    text: q.text,
    imageUrl: q.imageUrl,
    type: q.type,
    options: q.options,
    ...(isStudent
      ? { correctOption: null, explanation: null }
      : { correctOption: q.correctOption, explanation: q.explanation }),
  }));

  const maxAttempts = quiz.maxAttempts ?? 3;

  return {
    id: quiz.id,
    title: quiz.title,
    duration: quiz.duration,
    passingScore: quiz.passingScore,
    maxAttempts,
    isMandatory: quiz.isMandatory,
    chapterId: quiz.chapterId,
    chapter: quiz.chapter
      ? {
          id: quiz.chapter.id,
          title: quiz.chapter.title,
          courseId: quiz.chapter.courseId,
          course: quiz.chapter.course
            ? {
                id: quiz.chapter.course.id,
                title: quiz.chapter.course.title,
              }
            : undefined,
        }
      : undefined,
    questions: sanitizedQuestions,
    pastAttempts,
    attemptsCount: pastAttempts.length,
    attemptsRemaining: Math.max(0, maxAttempts - pastAttempts.length),
  };
}
