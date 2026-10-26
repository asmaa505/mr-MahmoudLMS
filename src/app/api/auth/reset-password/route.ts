import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { verifyOtpDetailed, deleteOtp, normalizeEmail } from "@/lib/otp";
import { z } from "zod";

const resetPasswordSchema = z
  .object({
    email: z.string().trim().email("صيغة البريد الإلكتروني غير صحيحة"),
    otp: z.string().trim().min(1, "يرجى إدخال كود التحقق"),
    newPassword: z
      .string()
      .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
      .regex(/\d/, "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل")
      .regex(
        /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/,
        "كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (!@#$%^&*...)"
      ),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.confirmPassword !== undefined && data.confirmPassword !== null) {
        return data.newPassword === data.confirmPassword;
      }
      return true;
    },
    {
      message: "كلمتا المرور غير متطابقتين",
      path: ["confirmPassword"],
    }
  );

export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "بيانات الطلب غير صالحة" },
        { status: 400 }
      );
    }

    // AC5: Password Criteria and matching confirmation validation
    const validation = resetPasswordSchema.safeParse(body);
    if (!validation.success) {
      const errorMsg =
        validation.error.issues?.[0]?.message ||
        (validation.error as any).errors?.[0]?.message ||
        "بيانات كلمة المرور غير صالحة";
      return NextResponse.json(
        { error: errorMsg },
        { status: 400 }
      );
    }

    const { email: rawEmail, otp, newPassword } = validation.data;
    const email = normalizeEmail(rawEmail);

    // AC1: Validate OTP with brute-force protection
    const otpResult = await verifyOtpDetailed(email, otp);
    if (otpResult.locked) {
      return NextResponse.json(
        {
          error:
            otpResult.error ||
            "تم تجاوز الحد الأقصى للمحاولات غير الصحيحة لكود التحقق. تم قفل المحاولات مؤقتاً لحماية الحساب.",
          locked: true,
          remainingAttempts: 0,
        },
        { status: 429 }
      );
    }

    if (!otpResult.success) {
      return NextResponse.json(
        { error: otpResult.error || "كود التحقق غير صحيح أو انتهت صلاحيته" },
        { status: 400 }
      );
    }

    // Find the user by email
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

    // Hash the new password using bcrypt
    const hashedPassword = await hashPassword(newPassword);

    // Update password in database
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Invalidate the OTP
    await deleteOtp(email);

    // Revoke all active sessions so previous devices are logged out for security
    await db.session.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json(
      {
        success: true,
        message: "تم تغيير كلمة السر بنجاح، يمكنك التسجيل الآن",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Reset Password Error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إعادة تعيين كلمة المرور" },
      { status: 500 }
    );
  }
}
