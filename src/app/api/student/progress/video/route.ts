import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { recordVideoProgress } from "@/lib/reports";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح، يرجى تسجيل الدخول" }, { status: 401 });
    }

    const body = await req.json();
    const { lectureId, currentTime, duration, isFinished } = body;

    if (!lectureId) {
      return NextResponse.json({ error: "معرف المحاضرة مطلوب" }, { status: 400 });
    }

    const progress = await recordVideoProgress(
      user.id,
      lectureId,
      Number(currentTime) || 0,
      Number(duration) || 0,
      Boolean(isFinished)
    );

    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (error: any) {
    console.error("[Video Progress API Error]:", error);
    return NextResponse.json(
      { error: error?.message || "حدث خطأ أثناء حفظ تقدم المشاهدة" },
      { status: 500 }
    );
  }
}
