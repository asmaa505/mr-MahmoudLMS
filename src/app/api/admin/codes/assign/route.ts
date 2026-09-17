import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
    }

    const { codeId, studentId } = await request.json();
    if (!codeId || !studentId) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const updatedCode = await db.activationCode.update({
      where: { id: codeId },
      data: {
        assignedToId: studentId,
        assignedAt: new Date(),
      },
      include: {
        assignedTo: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم تخصيص الكود للطالب بنجاح",
      code: updatedCode,
    });
  } catch (error: any) {
    console.error("Assign Code Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تخصيص الكود للطالب" }, { status: 500 });
  }
}
