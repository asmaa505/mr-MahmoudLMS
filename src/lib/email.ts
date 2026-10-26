import nodemailer, { Transporter } from "nodemailer";

export interface SentEmailRecord {
  to: string;
  subject: string;
  otp: string;
  resetLink: string;
  html: string;
  sentAt: Date;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  code?: string;
  details?: string;
}

export interface ParsedSmtpError {
  code: string;
  userFriendlyMessage: string;
  technicalDetails: string;
}

// Custom Exception for Email Service Configuration & Delivery Failures
export class EmailServiceError extends Error {
  public readonly code: string;
  public readonly technicalDetails?: string;

  constructor(message: string, code: string = "EMAIL_DELIVERY_FAILED", technicalDetails?: string) {
    super(message);
    this.name = "EmailServiceError";
    this.code = code;
    this.technicalDetails = technicalDetails;
  }
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

// Allows injecting a mock or custom transporter for testing error handling scenarios
let customTransporter: Transporter | null = null;

export function setCustomTransporter(transporter: Transporter | null): void {
  customTransporter = transporter;
}

/**
 * Parses and categorizes Nodemailer / SMTP errors into actionable messages
 * so administrators can immediately identify system misconfigurations.
 */
export function parseSmtpError(error: any): ParsedSmtpError {
  const errorCode = (error?.code || error?.name || "SMTP_ERROR").toString().toUpperCase();
  const rawMessage = (error?.message || "Unknown SMTP error occurred").toString();
  const response = error?.response ? error.response.toString() : "";
  const command = error?.command ? error.command.toString() : "";

  let userFriendlyMessage = "فشل في تسليم البريد الإلكتروني بسبب خطأ في إعدادات خادم البريد (SMTP).";

  if (
    errorCode === "EAUTH" ||
    rawMessage.includes("Invalid login") ||
    rawMessage.includes("authentication failed") ||
    rawMessage.includes("Username and Password not accepted") ||
    response.includes("535")
  ) {
    userFriendlyMessage =
      "خطأ في مصادقة خادم البريد (SMTP Authentication Failed): اسم المستخدم أو كلمة المرور غير صحيحة. يرجى التحقق من متغيرات SMTP_USER و SMTP_PASS.";
  } else if (
    errorCode === "ECONNREFUSED" ||
    rawMessage.includes("ECONNREFUSED") ||
    rawMessage.includes("connection refused")
  ) {
    userFriendlyMessage =
      "فشل الاتصال بخادم البريد (SMTP Connection Refused): تم رفض الاتصال بعنوان الخادم أو المنفذ المحدد. يرجى التحقق من SMTP_HOST و SMTP_PORT.";
  } else if (
    errorCode === "ETIMEDOUT" ||
    errorCode === "ESOCKETTIMEDOUT" ||
    rawMessage.includes("Connection timeout") ||
    rawMessage.includes("timed out")
  ) {
    userFriendlyMessage =
      "انتهت مهلة الاتصال بخادم البريد (SMTP Connection Timeout): تعذر إتمام الاتصال بخادم البريد في الوقت المحدد. يرجى مراجعة اتصال الشبكة وجدار الحماية.";
  } else if (
    errorCode === "ENOTFOUND" ||
    rawMessage.includes("getaddrinfo ENOTFOUND") ||
    rawMessage.includes("host not found")
  ) {
    userFriendlyMessage =
      "تعذر العثور على خادم البريد (SMTP Host Not Found): عنوان الخادم (SMTP_HOST) غير صحيح أو لا يمكن الوصول إليه عبر DNS.";
  } else if (
    errorCode === "ESOCKET" ||
    rawMessage.includes("self signed certificate") ||
    rawMessage.includes("SSL") ||
    rawMessage.includes("TLS")
  ) {
    userFriendlyMessage =
      "فشل الاتصال الآمن بخادم البريد (SMTP TLS/SSL Handshake Error): خطأ في إعدادات شهادة الأمان أو بروتوكول التشفير.";
  } else if (
    errorCode === "EENVELOPE" ||
    rawMessage.includes("No recipients defined") ||
    rawMessage.includes("Invalid recipient")
  ) {
    userFriendlyMessage = "خطأ في بيانات عنوان البريد الإلكتروني: عنوان المرسل أو المستقبل غير صالح.";
  } else if (errorCode === "ECONNRESET") {
    userFriendlyMessage = "تمت إعادة تعيين الاتصال بخادم البريد بشكل غير متوقع (Connection Reset).";
  }

  const technicalDetails = [
    `Code: ${errorCode}`,
    `Message: ${rawMessage}`,
    command ? `Command: ${command}` : null,
    response ? `Response: ${response}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  return {
    code: errorCode,
    userFriendlyMessage,
    technicalDetails,
  };
}

/**
 * Creates Nodemailer transporter based on environment or fallback test transporter.
 * Wrapped in exception handling to prevent unhandled configuration crashes.
 */
export function createTransporter(): Transporter {
  if (customTransporter) {
    return customTransporter;
  }

  try {
    const host = process.env.SMTP_HOST?.trim();
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) || 587 : 587;
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === "true" || port === 465;

    if (host && user) {
      return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass: pass || "",
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
    }

    if (host) {
      return nodemailer.createTransport({
        host,
        port,
        secure,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
    }

    // Fallback stream / json transporter for local dev & testing
    return nodemailer.createTransport({
      streamTransport: true,
      newline: "windows",
      buffer: true,
    });
  } catch (error: any) {
    console.error("[EmailService] Transporter initialization error:", {
      message: error?.message,
      stack: error?.stack,
    });
    throw new EmailServiceError(
      "فشل في تهيئة خادم البريد (Transporter Initialization Failed).",
      "TRANSPORTER_INIT_ERROR",
      error?.message
    );
  }
}

/**
 * Verifies the SMTP transporter connection and credentials.
 * Wrapped in exception handling blocks and logs failures internally.
 */
export async function verifyEmailConfiguration(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
  details?: string;
}> {
  try {
    const transporter = createTransporter();
    await transporter.verify();

    const isSmtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER);
    return {
      success: true,
      message: isSmtpConfigured
        ? "تم الاتصال بخادم البريد الإلكتروني (SMTP) بنجاح والتحقق من الإعدادات."
        : "تم التحقق: خدمة البريد تعمل بنجاح في وضع التطوير المحلي (Local Development Stream).",
    };
  } catch (error: any) {
    console.error("[EmailService] SMTP configuration verification failed:", {
      code: error?.code,
      message: error?.message,
      command: error?.command,
      response: error?.response,
      responseCode: error?.responseCode,
      stack: error?.stack,
    });

    const parsed = parseSmtpError(error);

    return {
      success: false,
      error: parsed.userFriendlyMessage,
      code: parsed.code,
      details: parsed.technicalDetails,
    };
  }
}

/**
 * Sends a generic email message wrapped in exception handling blocks.
 * Logs failure details internally and returns structured error response.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, html, text, from } = options;
  const fromAddress = from || process.env.EMAIL_FROM || '"منصة الأستاذ محمود الشحات" <no-reply@mr-mahmoud.com>';

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
      text,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error("[EmailService] Failed to send email via transporter:", {
      recipient: to,
      subject,
      code: error?.code,
      message: error?.message,
      command: error?.command,
      response: error?.response,
      responseCode: error?.responseCode,
      stack: error?.stack,
    });

    const parsed = parseSmtpError(error);

    return {
      success: false,
      error: parsed.userFriendlyMessage,
      code: parsed.code,
      details: parsed.technicalDetails,
    };
  }
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
 * Wrapped in exception handling blocks, logging failure details internally
 * while returning a clear, actionable error response to the client.
 */
export async function sendPasswordResetEmail(params: {
  to: string;
  otp: string;
  resetLink: string;
  userName?: string;
}): Promise<SendEmailResult> {
  const { to, otp, resetLink, userName } = params;

  try {
    const transporter = createTransporter();
    const fromAddress = process.env.EMAIL_FROM || '"منصة الأستاذ محمود الشحات" <no-reply@mr-mahmoud.com>';
    const subject = "كود استعادة كلمة المرور - منصة الفيزياء للأستاذ محمود الشحات";
    const html = generatePasswordResetEmailHtml({ otp, resetLink, userName });

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
    });

    // Store in memory for testing/verification only upon successful transmission
    sentEmailsHistory.push({
      to,
      subject,
      otp,
      resetLink,
      html,
      sentAt: new Date(),
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    // Log failure details internally with full diagnostics
    console.error("[EmailService] Failed to send password reset email via transporter:", {
      recipient: to,
      code: error?.code,
      message: error?.message,
      command: error?.command,
      response: error?.response,
      responseCode: error?.responseCode,
      stack: error?.stack,
    });

    const parsed = parseSmtpError(error);

    return {
      success: false,
      error: parsed.userFriendlyMessage,
      code: parsed.code,
      details: parsed.technicalDetails,
    };
  }
}
