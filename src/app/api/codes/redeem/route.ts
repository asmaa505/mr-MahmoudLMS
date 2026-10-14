import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { sanitizePayload } from "@/lib/sanitize";
import { rateLimit } from "@/lib/rateLimit";

/**
 * POST /api/codes/redeem
 * Endpoint for students to redeem/consume an activation code.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting by IP (15 requests per minute)
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const limiter = rateLimit(ip, 15, 60000);
    if (!limiter.success) {
      return NextResponse.json(
        { success: false, error: "تم تجاوز عدد المحاولات المسموح بها. يرجى الانتظار دقيقة والمحاولة لاحقاً." },
        { status: 429 }
      );
    }

    // 2. Authentication check
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "غير مصرح: يرجى تسجيل الدخول أولاً لتفعيل الكود" },
        { status: 401 }
      );
    }

    // 3. Extract and sanitize input
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json(
        { success: false, error: "يرجى إدخال كود التفعيل" },
        { status: 400 }
      );
    }

    const sanitized = sanitizePayload({ code });
    const cleanCode = sanitized.code.trim().toUpperCase();

    // 4. Find the activation code in database
    const dbCode = await db.activationCode.findUnique({
      where: { code: cleanCode },
      include: {
        course: true,
        lecture: {
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

    if (!dbCode) {
      return NextResponse.json(
        { success: false, error: "كود التفعيل غير صحيح أو غير موجود" },
        { status: 404 }
      );
    }

    // 5. Strict usage check: if already used, reject with distinct error
    if (dbCode.isUsed) {
      const usedFormattedDate = dbCode.usedAt
        ? new Date(dbCode.usedAt).toLocaleString("ar-EG", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : null;

      return NextResponse.json(
        {
          success: false,
          error: "هذا الكود مستخدم من قبل",
          usedAt: dbCode.usedAt,
          formattedUsedAt: usedFormattedDate,
        },
        { status: 400 }
      );
    }

    // 6. Resolve target course ID
    let targetCourseId = dbCode.courseId;
    if (dbCode.lectureId && dbCode.lecture) {
      targetCourseId = dbCode.lecture.chapter.courseId;
    }

    if (!targetCourseId) {
      return NextResponse.json(
        { success: false, error: "كود التفعيل غير صالح لأي كورس دراسي" },
        { status: 400 }
      );
    }

    // 7. Check if student is already enrolled in this course
    const existingEnrollment = await db.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: targetCourseId,
        },
      },
    });

    if (existingEnrollment) {
      return NextResponse.json(
        { success: false, error: "أنت مشترك بالفعل في هذا الكورس" },
        { status: 400 }
      );
    }

    // 8. Atomic transaction: create enrollment & consume code (mark isUsed = true, usedById, usedAt)
    const now = new Date();
    await db.$transaction([
      db.enrollment.create({
        data: {
          userId: user.id,
          courseId: targetCourseId,
        },
      }),
      db.activationCode.update({
        where: { id: dbCode.id },
        data: {
          isUsed: true,
          usedById: user.id,
          usedAt: now,
        },
      }),
    ]);

    const courseTitle =
      dbCode.course?.title || dbCode.lecture?.chapter.course.title || "الكورس";

    return NextResponse.json({
      success: true,
      message: `تم بنجاح تفعيل واشتراك في: ${courseTitle}`,
      data: {
        code: dbCode.code,
        courseId: targetCourseId,
        courseTitle,
        usedAt: now,
      },
    });
  } catch (error: any) {
    console.error("Redeem Code Error:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ غير متوقع أثناء تفعيل الكود" },
      { status: 500 }
    );
  }
}
