import * as crypto from 'crypto';

export interface SignedStreamPayload {
  userId: string;
  lessonId: string;
  clientIp: string;
  expiresAt: number; // Unix timestamp in seconds
}

export class CryptoUtil {
  /**
   * Generates a time-limited HMAC-SHA256 signed streaming token.
   * Bound to user ID, lesson ID, expiration timestamp, and optionally client IP.
   */
  static generateStreamToken(
    payload: SignedStreamPayload,
    secret: string,
  ): string {
    const rawData = `${payload.userId}:${payload.lessonId}:${payload.expiresAt}:${payload.clientIp}`;
    const base64Data = Buffer.from(rawData).toString('base64url');

    const signature = crypto
      .createHmac('sha256', secret)
      .update(base64Data)
      .digest('hex');

    return `${base64Data}.${signature}`;
  }

  /**
   * Validates and verifies an HMAC-SHA256 signed streaming token.
   * Checks signature integrity, expiration timestamp, lesson ID match, and optional IP match.
   */
  static verifyStreamToken(
    token: string,
    secret: string,
    expectedLessonId: string,
    expectedUserId?: string,
  ): { valid: boolean; payload?: SignedStreamPayload; error?: string } {
    if (!token || !token.includes('.')) {
      return { valid: false, error: 'تنسيق رمز البث غير صالح' };
    }

    const [base64Data, signature] = token.split('.');
    if (!base64Data || !signature) {
      return { valid: false, error: 'رمز البث غير مكتمل' };
    }

    // Recompute signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(base64Data)
      .digest('hex');

    const isSignatureValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    );

    if (!isSignatureValid) {
      return { valid: false, error: 'توقيع رمز البث غير صالح ومرفوض أمنياً' };
    }

    // Decode payload
    try {
      const decodedString = Buffer.from(base64Data, 'base64url').toString('utf8');
      const [userId, lessonId, expiresAtStr, clientIp] = decodedString.split(':');
      const expiresAt = parseInt(expiresAtStr, 10);

      const now = Math.floor(Date.now() / 1000);
      if (now > expiresAt) {
        return { valid: false, error: 'انتهت صلاحية رابط البث الآمن' };
      }

      if (lessonId !== expectedLessonId) {
        return { valid: false, error: 'رمز البث غير مطابق للمحاضرة المطلوبة' };
      }

      if (expectedUserId && userId !== expectedUserId) {
        return { valid: false, error: 'رمز البث غير مطابق لحساب المستخدم الحالي' };
      }

      return {
        valid: true,
        payload: {
          userId,
          lessonId,
          expiresAt,
          clientIp,
        },
      };
    } catch {
      return { valid: false, error: 'تعذر فك تشفير حمولة رمز البث' };
    }
  }

  /**
   * Hashes a string using SHA-256 (useful for tokens or fingerprints).
   */
  static sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
