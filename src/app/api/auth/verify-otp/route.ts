import { NextRequest, NextResponse } from "next/server";
import { verifyOtpDetailed, normalizeEmail } from "@/lib/otp";
import { z } from "zod";

const verifyOtpSchema = z.object({
  email: z.string().trim().email("صيغة البريد الإلكتروني غير صحيحة"),
  otp: z.string().trim().min(4, "يرجى إدخال كود التحقق"),
});

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

    const validation = verifyOtpSchema.safeParse(body);
    if (!validation.success) {
      const errorMsg =
        validation.error.issues?.[0]?.message ||
        (validation.error as any).errors?.[0]?.message ||
        "بيانات غير صالحة";
      return NextResponse.json(
        { error: errorMsg },
        { status: 400 }
      );
    }

    const email = normalizeEmail(validation.data.email);
    const otp = validation.data.otp;

    // AC1: Validate OTP against Redis / Cache with rate limiting & lock on consecutive failures
    const result = await verifyOtpDetailed(email, otp);
    if (result.locked) {
      return NextResponse.json(
        {
          error:
            result.error ||
            "تم تجاوز الحد الأقصى للمحاولات غير الصحيحة لكود التحقق. تم قفل المحاولات مؤقتاً لحماية الحساب.",
          locked: true,
          remainingAttempts: 0,
        },
        { status: 429 }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "كود التحقق غير صحيح أو انتهت صلاحيته",
          remainingAttempts: result.remainingAttempts,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "تم التحقق من كود الاستعادة بنجاح",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Verify OTP Error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء التحقق من الكود" },
      { status: 500 }
    );
  }
}
