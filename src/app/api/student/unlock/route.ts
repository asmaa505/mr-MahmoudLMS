import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { sanitizePayload } from "@/lib/sanitize";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const limiter = rateLimit(ip, 15, 60000); // 15 requests per minute limit
    if (!limiter.success) {
      return NextResponse.json(
        { error: "تم تجاوز عدد المحاولات المسموح بها. يرجى المحاولة لاحقاً." },
        { status: 429 }
      );
    }

    const user = await getAuthUser();
    if (!user || (user.role !== "STUDENT" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "غير مصرح لك بالوصول" }, { status: 401 });
    }

    const { code } = await request.json();
    if (!code) {
      return NextResponse.json({ error: "يرجى إدخال كود التفعيل" }, { status: 400 });
    }

    const sanitized = sanitizePayload({ code });
    const cleanCode = sanitized.code.trim().toUpperCase();

    // Process redemption inside an isolated database transaction to prevent concurrent exploitation
    const now = new Date();
    const result = await db.$transaction(async (tx) => {
      // 1. Fetch activation code inside the transaction
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

      if (dbCode.isUsed) {
        throw new Error("CODE_ALREADY_USED");
      }

      let targetCourseId = dbCode.courseId;

      // If it's a lecture activation code, unlock the course it belongs to
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

      // 2. Transition code status to USED instantly with atomic concurrency guard
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

      // 3. Create student enrollment
      await tx.enrollment.create({
        data: {
          userId: user.id,
          courseId: targetCourseId,
        },
      });

      const courseTitle = dbCode.course?.title || dbCode.lecture?.chapter.course.title || "الكورس";
      return { courseTitle };
    });

    return NextResponse.json({
      message: `تم بنجاح تفعيل واشتراك في: ${result.courseTitle}`,
    });
  } catch (error: any) {
    if (error.message === "CODE_NOT_FOUND") {
      return NextResponse.json({ error: "كود تفعيل غير صحيح أو تم استخدامه بالفعل" }, { status: 404 });
    }
    if (error.message === "CODE_ALREADY_USED") {
      return NextResponse.json({ error: "كود تفعيل غير صحيح أو تم استخدامه بالفعل" }, { status: 400 });
    }
    if (error.message === "INVALID_COURSE") {
      return NextResponse.json({ error: "كود التفعيل غير صالح لأي كورس" }, { status: 400 });
    }
    if (error.message === "ALREADY_ENROLLED") {
      return NextResponse.json({ error: "أنت مشترك بالفعل في هذا الكورس" }, { status: 400 });
    }
    console.error("Activation Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تفعيل الكود" }, { status: 500 });
  }
}
