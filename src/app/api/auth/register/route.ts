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

    const { name, phone, password, grade, parentPhone, email } = await request.json();

    if (!name || !phone || !password || !grade || !parentPhone) {
      return NextResponse.json(
        { error: "جميع الحقول مطلوبة، بما في ذلك رقم ولي الأمر" },
        { status: 400 }
      );
    }

    const sanitized = sanitizePayload({ name, phone, grade, parentPhone, email: email || "" });
    const cleanName = sanitized.name.trim();
    const cleanPhone = sanitized.phone.trim();
    const cleanGrade = sanitized.grade;
    const cleanParentPhone = sanitized.parentPhone.trim();
    const cleanEmail = sanitized.email ? sanitized.email.trim().toLowerCase() : null;

    if (cleanEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return NextResponse.json(
          { error: "يرجى إدخال بريد إلكتروني صحيح" },
          { status: 400 }
        );
      }
    }

    // Validate phone formats (Egyptian standard 11 digits: 010, 011, 012, 015)
    const phoneRegex = /^01[0125][0-9]{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return NextResponse.json(
        { error: "يرجى إدخال رقم هاتف صحيح للطالب (11 رقماً يبدأ بـ 01)" },
        { status: 400 }
      );
    }

    if (!phoneRegex.test(cleanParentPhone)) {
      return NextResponse.json(
        { error: "يرجى إدخال رقم هاتف صحيح لولي الأمر (11 رقماً يبدأ بـ 01)" },
        { status: 400 }
      );
    }

    if (cleanPhone === cleanParentPhone) {
      return NextResponse.json(
        { error: "يجب أن يكون رقم هاتف ولي الأمر مختلفاً عن رقم هاتف الطالب لضمان دقة المتابعة" },
        { status: 400 }
      );
    }

    // Check if student phone number already exists
    const existingUser = await db.user.findUnique({
      where: { phone: cleanPhone },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "رقم هاتف الطالب مسجل بالفعل في المنصة" },
        { status: 400 }
      );
    }

    // Check if student email already exists
    if (cleanEmail) {
      const existingEmail = await db.user.findFirst({
        where: { email: cleanEmail },
      });
      if (existingEmail) {
        return NextResponse.json(
          { error: "البريد الإلكتروني مسجل بالفعل في المنصة" },
          { status: 400 }
        );
      }
    }

    const hashedPassword = await hashPassword(password);

    // Create the student account (isApproved defaults to false)
    const newUser = await db.user.create({
      data: {
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        password: hashedPassword,
        grade: cleanGrade,
        parentPhone: cleanParentPhone,
        role: "STUDENT",
        isApproved: false, // Must be approved by Mr. Mahmoud
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
