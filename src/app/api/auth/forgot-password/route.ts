import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { saveOtp, checkOtpRateLimit, normalizeEmail } from "@/lib/otp";
import { sendPasswordResetEmail } from "@/lib/email";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "يرجى إدخال البريد الإلكتروني")
    .email("صيغة البريد الإلكتروني غير صحيحة"),
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "بيانات الطلب غير صالحة" },
        { status: 400 }
      );
    }

    const validation = forgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      const errorMsg =
        validation.error.issues?.[0]?.message ||
        (validation.error as any).errors?.[0]?.message ||
        "صيغة البريد الإلكتروني غير صحيحة";
      return NextResponse.json(
        { error: errorMsg },
        { status: 400 }
      );
    }

    const email = normalizeEmail(validation.data.email);

    // Rate Limiting (AC7): Max 3 requests per hour per IP & email
    const ipRateLimit = checkOtpRateLimit(`ip:${ip}`, 3, 60 * 60 * 1000);
    const emailRateLimit = checkOtpRateLimit(`email:${email}`, 3, 60 * 60 * 1000);

    if (!ipRateLimit.success || !emailRateLimit.success) {
      return NextResponse.json(
        {
          error: "تم تجاوز الحد المسموح به من طلبات استعادة كلمة المرور (3 محاولات كل ساعة). يرجى المحاولة لاحقاً.",
        },
        { status: 429 }
      );
    }

    // AC2: Check if email exists in database
    const user = await db.user.findFirst({
      where: {
        email: {
          equals: email,
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "البريد الإلكتروني غير مسجل بالمنصة" },
        { status: 404 }
      );
    }

    // Generate 6-digit numeric OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in cache/Redis with TTL 900 seconds (15 minutes) and strict expiration timestamp
    const otpRecord = await saveOtp(email, otp, 900);

    // Build reset link
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.nextUrl?.origin ||
      "http://localhost:3000";
    const resetLink = `${origin}/reset-password?email=${encodeURIComponent(email)}&otp=${otp}`;

    // AC3: Send HTML email template containing OTP & reset link
    const emailResult = await sendPasswordResetEmail({
      to: email,
      otp,
      resetLink,
      userName: user.name,
    });

    if (!emailResult.success) {
      console.error("[ForgotPassword API Error] Email delivery failed:", {
        email,
        error: emailResult.error,
        code: emailResult.code,
        details: emailResult.details,
      });

      return NextResponse.json(
        {
          error:
            emailResult.error ||
            "فشل إرسال كود التحقق بسبب خطأ في إعدادات خادم البريد (SMTP). يرجى مراجعة إعدادات البريد والمحاولة لاحقاً.",
          code: emailResult.code || "EMAIL_DELIVERY_FAILED",
          details: emailResult.details,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "تم إرسال كود التحقق بنجاح إلى بريدك الإلكتروني",
        expiresAt: otpRecord.expiresAt,
        expiresAtDate: otpRecord.expiresAtDate,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Forgot Password Error:", error);
    return NextResponse.json(
      {
        error: error?.userFriendlyMessage || error?.message || "حدث خطأ أثناء معالجة طلب استعادة كلمة المرور",
        code: error?.code || "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
