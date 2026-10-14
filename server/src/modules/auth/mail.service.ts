import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');

    if (host && user) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.configService.get<number>('SMTP_PORT', 587),
        secure: this.configService.get<boolean>('SMTP_SECURE', false),
        auth: {
          user,
          pass: this.configService.get<string>('SMTP_PASS', ''),
        },
      });
    } else {
      // Fallback stream / json transport for dev & testing
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'windows',
        buffer: true,
      });
    }
  }

  async sendPasswordResetOtp(email: string, otp: string, userName?: string): Promise<boolean> {
    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
    const resetLink = `${appUrl}/reset-password?email=${encodeURIComponent(email)}&otp=${otp}`;
    const displayName = userName ? `مرحباً ${userName}` : 'مرحباً بك';

    const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>استعادة كلمة المرور</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #030712; color: #f1f5f9; margin: 0; padding: 20px; direction: rtl; text-align: right; }
    .card { max-width: 540px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 14px; padding: 30px; }
    .header { text-align: center; color: #38bdf8; font-size: 22px; font-weight: bold; margin-bottom: 20px; }
    .otp { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #38bdf8; text-align: center; padding: 20px; background: #1e293b; border-radius: 10px; margin: 20px 0; }
    .btn { display: block; text-align: center; background: #0284c7; color: #fff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0; }
    .notice { font-size: 13px; color: #fca5a5; margin-top: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">منصة الفيزياء - الأستاذ محمود الشحات</div>
    <p>${displayName}،</p>
    <p>لقد استلمنا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. كود التحقق الخاص بك هو:</p>
    <div class="otp">${otp}</div>
    <a href="${resetLink}" class="btn" target="_blank">إعادة تعيين كلمة المرور مباشرة</a>
    <div class="notice">⏱️ كود التحقق صالح لمدة 15 دقيقة فقط. إذا لم تكن قد طلبت هذا الكود، يرجى تجاهل هذه الرسالة.</div>
  </div>
</body>
</html>
    `.trim();

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('EMAIL_FROM', '"منصة الأستاذ محمود الشحات" <no-reply@mr-mahmoud.com>'),
        to: email,
        subject: 'كود استعادة كلمة المرور - منصة الفيزياء للأستاذ محمود الشحات',
        html,
      });
      this.logger.log(`Password reset email sent to ${email} with OTP ${otp}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send password reset email to ${email}:`, err.message);
      return false;
    }
  }
}
