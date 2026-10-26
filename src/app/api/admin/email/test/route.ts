import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { verifyEmailConfiguration, sendEmail, parseSmtpError } from "@/lib/email";

/**
 * GET /api/admin/email/test
 * Verifies the SMTP transporter connection & authentication.
 * Wraps service calls in exception handling blocks, logs failures internally,
 * and returns clear error responses to the administrator.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
    }

    const result = await verifyEmailConfiguration();

    if (!result.success) {
      console.error("[Admin Email Verification Failed]:", {
        adminId: user.id,
        adminEmail: user.email,
        error: result.error,
        code: result.code,
        details: result.details,
      });

      return NextResponse.json(
        {
          success: false,
          error: result.error,
          code: result.code,
          details: result.details,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error("[Admin Email Verification Unexpected Exception]:", error);
    const parsed = parseSmtpError(error);

    return NextResponse.json(
      {
        success: false,
        error: parsed.userFriendlyMessage,
        code: parsed.code,
        details: parsed.technicalDetails,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/email/test
 * Sends a test email to the specified recipient (or admin's own email)
 * or tests SMTP connection.
 * Wrapped in exception handling blocks, logs failures internally,
 * and returns a clear, actionable error response to the client.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }

    const testRecipient = body?.testEmail || body?.to;

    if (testRecipient) {
      const emailResult = await sendEmail({
        to: testRecipient,
        subject: "اختبار إعدادات البريد - منصة الأستاذ محمود الشحات",
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; padding: 24px; background: #0f172a; color: #fff; border-radius: 12px; border: 1px solid #1e293b;">
            <h2 style="color: #38bdf8; margin-top: 0;">اختبار إعدادات البريد الإلكتروني بنجاح</h2>
            <p style="color: #cbd5e1; font-size: 15px;">مرحباً ${user.name}،</p>
            <p style="color: #94a3b8; line-height: 1.6;">تم تأكيد صحة إعدادات خادم البريد (SMTP) في منصة الأستاذ محمود الشحات للفيزياء بنجاح.</p>
            <p style="color: #64748b; font-size: 12px; margin-top: 24px;">وقت الإرسال: ${new Date().toLocaleString("ar-EG")}</p>
          </div>
        `,
      });

      if (!emailResult.success) {
        console.error("[Admin Test Email Send Failed]:", {
          adminId: user.id,
          recipient: testRecipient,
          error: emailResult.error,
          code: emailResult.code,
          details: emailResult.details,
        });

        return NextResponse.json(
          {
            success: false,
            error: emailResult.error,
            code: emailResult.code,
            details: emailResult.details,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `تم إرسال بريد الاختبار بنجاح إلى ${testRecipient}`,
      });
    }

    // If no testRecipient provided, verify configuration directly
    const verifyResult = await verifyEmailConfiguration();
    if (!verifyResult.success) {
      console.error("[Admin Email Verification Failed]:", {
        adminId: user.id,
        error: verifyResult.error,
        code: verifyResult.code,
        details: verifyResult.details,
      });

      return NextResponse.json(
        {
          success: false,
          error: verifyResult.error,
          code: verifyResult.code,
          details: verifyResult.details,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: verifyResult.message,
    });
  } catch (error: any) {
    console.error("[Admin Email Route Unexpected Exception]:", error);
    const parsed = parseSmtpError(error);

    return NextResponse.json(
      {
        success: false,
        error: parsed.userFriendlyMessage,
        code: parsed.code,
        details: parsed.technicalDetails,
      },
      { status: 500 }
    );
  }
}
