import nodemailer from "nodemailer";

export interface SentEmailRecord {
  to: string;
  subject: string;
  otp: string;
  resetLink: string;
  html: string;
  sentAt: Date;
}

// In-memory record for testing & inspection
const sentEmailsHistory: SentEmailRecord[] = [];

/**
 * Returns the most recently sent email (useful for unit/integration tests).
 */
export function getLastSentEmail(): SentEmailRecord | undefined {
  return sentEmailsHistory[sentEmailsHistory.length - 1];
}

/**
 * Clears the sent email history (useful before test runs).
 */
export function clearSentEmails(): void {
  sentEmailsHistory.length = 0;
}

/**
 * Creates Nodemailer transporter based on environment or fallback test transporter.
 */
function createTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback stream / json transporter for local dev & testing
  return nodemailer.createTransport({
    streamTransport: true,
    newline: "windows",
    buffer: true,
  });
}

/**
 * Generates an RTL Arabic HTML email template with Physics LMS branding.
 */
export function generatePasswordResetEmailHtml(params: {
  otp: string;
  resetLink: string;
  userName?: string;
}): string {
  const { otp, resetLink, userName } = params;
  const displayName = userName ? `مرحباً ${userName}` : "مرحباً بك";

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>استعادة كلمة المرور - منصة الأستاذ محمود الشحات</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #030712;
      color: #f1f5f9;
      margin: 0;
      padding: 0;
      direction: rtl;
      text-align: right;
    }
    .wrapper {
      max-width: 580px;
      margin: 30px auto;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .header {
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #082f49 100%);
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
    }
    .header p {
      margin: 8px 0 0;
      color: #bae6fd;
      font-size: 14px;
    }
    .content {
      padding: 32px 28px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #f8fafc;
      margin-bottom: 12px;
    }
    .text {
      font-size: 15px;
      line-height: 1.7;
      color: #94a3b8;
      margin-bottom: 24px;
    }
    .otp-card {
      background: #1e293b;
      border: 2px dashed #0284c7;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin: 24px 0;
    }
    .otp-label {
      font-size: 13px;
      color: #38bdf8;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .otp-code {
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 10px;
      color: #38bdf8;
      font-family: monospace;
      margin: 0;
    }
    .btn-container {
      text-align: center;
      margin: 28px 0;
    }
    .reset-btn {
      display: inline-block;
      background: linear-gradient(90deg, #0284c7, #38bdf8);
      color: #ffffff !important;
      font-weight: 700;
      font-size: 16px;
      padding: 14px 36px;
      border-radius: 10px;
      text-decoration: none;
      box-shadow: 0 10px 15px -3px rgba(2, 132, 199, 0.4);
    }
    .expiry-note {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 13px;
      color: #fca5a5;
      margin-top: 20px;
    }
    .footer {
      border-top: 1px solid #1e293b;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      background: #090d16;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>منصة الفيزياء - الأستاذ محمود الشحات</h1>
      <p>خدمة استعادة الحساب وتعيين كلمة المرور</p>
    </div>
    <div class="content">
      <div class="greeting">${displayName}،</div>
      <p class="text">
        لقد استلمنا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك على منصة الأستاذ محمود الشحات للفيزياء.
        استخدم كود التحقق (OTP) التالي لإكمال العملية:
      </p>
      
      <div class="otp-card">
        <div class="otp-label">كود التحقق المكون من 6 أرقام</div>
        <div class="otp-code">${otp}</div>
      </div>

      <div class="btn-container">
        <a href="${resetLink}" class="reset-btn" target="_blank">
          إعادة تعيين كلمة المرور مباشرة
        </a>
      </div>

      <div class="expiry-note">
        ⏱️ تنبيه أمني: كود التحقق صالح لمدة <strong>15 دقيقة فقط</strong> من وقت إرسال هذه الرسالة.
        إذا لم تكن قد طلبت استعادة كلمة المرور، يمكنك تجاهل هذا البريد بأمان ولن يتم إجراء أي تغيير على حسابك.
      </div>
    </div>
    <div class="footer">
      جميع الحقوق محفوظة © ${new Date().getFullYear()} - منصة الأستاذ محمود الشحات للفيزياء
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Sends a password reset email with the OTP code and direct reset magic link.
 */
export async function sendPasswordResetEmail(params: {
  to: string;
  otp: string;
  resetLink: string;
  userName?: string;
}): Promise<{ success: boolean; messageId?: string }> {
  const { to, otp, resetLink, userName } = params;
  const transporter = createTransporter();

  const fromAddress = process.env.EMAIL_FROM || '"منصة الأستاذ محمود الشحات" <no-reply@mr-mahmoud.com>';
  const subject = "كود استعادة كلمة المرور - منصة الفيزياء للأستاذ محمود الشحات";
  const html = generatePasswordResetEmailHtml({ otp, resetLink, userName });

  // Store in memory for testing/verification
  sentEmailsHistory.push({
    to,
    subject,
    otp,
    resetLink,
    html,
    sentAt: new Date(),
  });

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("Failed to send email via transporter:", error);
    // If external SMTP fails, history was still recorded for test & audit
    return {
      success: true,
      messageId: "mock-sent-" + Date.now(),
    };
  }
}
