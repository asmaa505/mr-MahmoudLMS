import { NextRequest, NextResponse } from "next/server";
import { verifyOtp, normalizeEmail } from "@/lib/otp";
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

    // AC4: Validate OTP against Redis / Cache
    const isValid = await verifyOtp(email, otp);
    if (!isValid) {
      return NextResponse.json(
        { error: "كود التحقق غير صحيح أو انتهت صلاحيته" },
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
