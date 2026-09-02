import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comparePassword, signToken } from "@/lib/auth";
import { cookies } from "next/headers";
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

    const { phone, password } = await request.json();

    if (!phone || !password) {
      return NextResponse.json(
        { error: "يرجى إدخال رقم الهاتف وكلمة المرور" },
        { status: 400 }
      );
    }

    const sanitized = sanitizePayload({ phone, password });
    const cleanPhone = sanitized.phone.trim();
    const cleanPassword = sanitized.password;

    // Fetch user
    const user = await db.user.findUnique({
      where: { phone: cleanPhone },
    });

    if (!user) {
      return NextResponse.json(
        { error: "بيانات الدخول غير صحيحة" },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await comparePassword(cleanPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "بيانات الدخول غير صحيحة" },
        { status: 401 }
      );
    }

    // Check account status for student
    if (user.role === "STUDENT") {
      if (!user.isApproved) {
        return NextResponse.json(
          { error: "حسابك قيد الانتظار لموافقة الأستاذ محمود الشحات" },
          { status: 403 }
        );
      }
      if (user.isBlocked) {
        return NextResponse.json(
          { error: "تم حظر حسابك. يرجى التواصل مع الأستاذ محمود الشحات" },
          { status: 403 }
        );
      }
    }

    // Enforce single-device restriction: clear previous sessions
    await db.session.deleteMany({
      where: { userId: user.id },
    });

    // Generate unique sessionId
    const sessionId = crypto.randomUUID();

    // Create session record
    const userAgent = request.headers.get("user-agent") || "Unknown";
    const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";

    const token = signToken({
      userId: user.id,
      role: user.role,
      name: user.name,
      phone: user.phone,
      sessionId,
    });

    await db.session.create({
      data: {
        token,
        userId: user.id,
        userAgent,
        ipAddress,
      },
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return NextResponse.json({
      message: "تم تسجيل الدخول بنجاح",
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        grade: user.grade,
      },
    });
  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تسجيل الدخول" },
      { status: 500 }
    );
  }
}
