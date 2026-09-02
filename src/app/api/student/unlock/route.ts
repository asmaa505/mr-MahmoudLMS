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

    // Find the activation code
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
      return NextResponse.json({ error: "كود تفعيل غير صحيح أو تم استخدامه بالفعل" }, { status: 404 });
    }

    if (dbCode.isUsed) {
      return NextResponse.json({ error: "كود تفعيل غير صحيح أو تم استخدامه بالفعل" }, { status: 400 });
    }

    let targetCourseId = dbCode.courseId;

    // If it's a lecture activation code, unlock the course it belongs to
    if (dbCode.lectureId && dbCode.lecture) {
      targetCourseId = dbCode.lecture.chapter.courseId;
    }

    if (!targetCourseId) {
      return NextResponse.json({ error: "كود التفعيل غير صالح لأي كورس" }, { status: 400 });
    }

    // Check if student is already enrolled in this course
    const existingEnrollment = await db.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: targetCourseId,
        },
      },
    });

    if (existingEnrollment) {
      return NextResponse.json({ error: "أنت مشترك بالفعل في هذا الكورس" }, { status: 400 });
    }

    // Process transaction: create enrollment & mark code as used
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
          usedAt: new Date(),
        },
      }),
    ]);

    const courseTitle = dbCode.course?.title || dbCode.lecture?.chapter.course.title || "الكورس";

    return NextResponse.json({
      message: `تم بنجاح تفعيل واشتراك في: ${courseTitle}`,
    });
  } catch (error: any) {
    console.error("Activation Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تفعيل الكود" }, { status: 500 });
  }
}
