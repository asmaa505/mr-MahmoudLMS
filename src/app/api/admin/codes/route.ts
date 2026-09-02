import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

// Helper to generate codes
function generateRandomCode(prefix: string) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No easily confused characters like O, I, 1, 0
  const genSegment = (len: number) => {
    let s = "";
    for (let i = 0; i < len; i++) {
      s += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return s;
  };
  return `${prefix}-${genSegment(4)}-${genSegment(4)}`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
    }

    const { scope, courseId, lectureId, prefix, count } = await request.json();
    if (!scope || !count) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const cleanPrefix = prefix ? prefix.trim().toUpperCase() : "PHY";
    const numCount = Math.min(Math.max(parseInt(count) || 1, 1), 50); // limit bulk generation to max 50

    const createdCodes = [];

    for (let i = 0; i < numCount; i++) {
      // Loop to ensure uniqueness (if duplicate found, retry)
      let uniqueCode = "";
      let attempts = 0;
      while (attempts < 10) {
        const potential = generateRandomCode(cleanPrefix);
        const exists = await db.activationCode.findUnique({
          where: { code: potential },
        });
        if (!exists) {
          uniqueCode = potential;
          break;
        }
        attempts++;
      }

      if (!uniqueCode) continue;

      const newCode = await db.activationCode.create({
        data: {
          code: uniqueCode,
          courseId: scope === "COURSE" ? courseId : null,
          lectureId: scope === "LECTURE" ? lectureId : null,
        },
      });

      createdCodes.push(newCode);
    }

    return NextResponse.json({
      message: `تم توليد عدد ${createdCodes.length} كود تفعيل بنجاح`,
      codes: createdCodes,
    });
  } catch (error: any) {
    console.error("Generate Codes Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء توليد الأكواد" }, { status: 550 });
  }
}
