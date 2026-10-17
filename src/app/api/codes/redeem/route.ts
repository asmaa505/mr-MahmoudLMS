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

    // 4. Process redemption inside an isolated database transaction to prevent concurrent exploitation
    const now = new Date();
    const result = await db.$transaction(async (tx) => {
      // Find the activation code inside the transaction
      const dbCode = await tx.activationCode.findUnique({
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
        throw new Error("CODE_NOT_FOUND");
      }

      // Strict usage check: if already used, reject
      if (dbCode.isUsed) {
        throw new Error("CODE_ALREADY_USED");
      }

      // Resolve target course ID
      let targetCourseId = dbCode.courseId;
      if (dbCode.lectureId && dbCode.lecture) {
        targetCourseId = dbCode.lecture.chapter.courseId;
      }

      if (!targetCourseId) {
        throw new Error("INVALID_COURSE");
      }

      // Check if student is already enrolled in this course
      const existingEnrollment = await tx.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId: targetCourseId,
          },
        },
      });

      if (existingEnrollment) {
        throw new Error("ALREADY_ENROLLED");
      }

      // Atomically transition code status to USED instantly
      const updateResult = await tx.activationCode.updateMany({
        where: {
          id: dbCode.id,
          isUsed: false,
        },
        data: {
          isUsed: true,
          usedById: user.id,
          usedAt: now,
        },
      });

      if (updateResult.count === 0) {
        throw new Error("CODE_ALREADY_USED");
      }

      // Create student enrollment
      await tx.enrollment.create({
        data: {
          userId: user.id,
          courseId: targetCourseId,
        },
      });

      const courseTitle =
        dbCode.course?.title || dbCode.lecture?.chapter.course.title || "الكورس";

      return {
        code: dbCode.code,
        courseId: targetCourseId,
        courseTitle,
        usedAt: now,
      };
    });

    return NextResponse.json({
      success: true,
      message: `تم بنجاح تفعيل واشتراك في: ${result.courseTitle}`,
      data: result,
    });
  } catch (error: any) {
    if (error.message === "CODE_NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: "كود التفعيل غير صحيح أو غير موجود" },
        { status: 404 }
      );
    }
    if (error.message === "CODE_ALREADY_USED") {
      return NextResponse.json(
        { success: false, error: "هذا الكود مستخدم من قبل" },
        { status: 400 }
      );
    }
    if (error.message === "INVALID_COURSE") {
      return NextResponse.json(
        { success: false, error: "كود التفعيل غير صالح لأي كورس دراسي" },
        { status: 400 }
      );
    }
    if (error.message === "ALREADY_ENROLLED") {
      return NextResponse.json(
        { success: false, error: "أنت مشترك بالفعل في هذا الكورس" },
        { status: 400 }
      );
    }
    console.error("Redeem Code Error:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ غير متوقع أثناء تفعيل الكود" },
      { status: 500 }
    );
  }
}
