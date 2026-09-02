import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
    }

    const { title, duration, passingScore, isMandatory, chapterId } = await request.json();
    if (!title || !duration || !chapterId) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const quiz = await db.quiz.create({
      data: {
        title,
        duration: parseInt(duration),
        passingScore: parseInt(passingScore) || 50,
        isMandatory: isMandatory === true,
        chapterId,
      },
      include: {
        questions: true,
        chapter: {
          include: {
            course: true,
          },
        },
      },
    });

    return NextResponse.json({ message: "تم إنشاء الاختبار بنجاح", quiz });
  } catch (error: any) {
    console.error("Create Quiz Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء إنشاء الاختبار" }, { status: 500 });
  }
}
