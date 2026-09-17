import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { sanitizePayload } from "@/lib/sanitize";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const limiter = rateLimit(ip, 10, 60000); // 10 registrations per minute limit
    if (!limiter.success) {
      return NextResponse.json(
        { error: "تم تجاوز الحد المسموح به من الطلبات. يرجى المحاولة لاحقاً." },
        { status: 429 }
      );
    }

    const { name, phone, password, grade } = await request.json();

    if (!name || !phone || !password || !grade) {
      return NextResponse.json(
        { error: "جميع الحقول مطلوبة" },
        { status: 400 }
      );
    }

    const sanitized = sanitizePayload({ name, phone, password, grade });
    const cleanName = sanitized.name.trim();
    const cleanPhone = sanitized.phone.trim();
    const cleanPassword = sanitized.password;
    const cleanGrade = sanitized.grade;

    // Check if phone number already exists
    const existingUser = await db.user.findUnique({
      where: { phone: cleanPhone },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "رقم الهاتف مسجل بالفعل" },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(cleanPassword);

    // Create the student account (isApproved defaults to false)
    const newUser = await db.user.create({
      data: {
        name: cleanName,
        phone: cleanPhone,
        password: hashedPassword,
        grade: cleanGrade,
        role: "STUDENT",
        isApproved: false, // Must be approved by Mr. Mahmud
      },
    });

    return NextResponse.json(
      {
        message: "تم التسجيل بنجاح، يرجى انتظار تفعيل الحساب من قبل المعلم",
        userId: newUser.id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Register Error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء التسجيل" },
      { status: 500 }
    );
  }
}
