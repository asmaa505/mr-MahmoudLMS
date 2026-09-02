import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
    }

    const { quizId, text, imageUrl, type, options, correctOption, explanation } = await request.json();
    if (!quizId || !text || !type) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const question = await db.question.create({
      data: {
        quizId,
        text,
        imageUrl: imageUrl || null,
        type,
        options: options ? JSON.stringify(options) : null,
        correctOption: correctOption !== undefined ? parseInt(correctOption) : null,
        explanation: explanation || null,
      },
    });

    return NextResponse.json({ message: "تم إضافة السؤال بنجاح", question });
  } catch (error: any) {
    console.error("Create Question Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء إضافة السؤال" }, { status: 500 });
  }
}
