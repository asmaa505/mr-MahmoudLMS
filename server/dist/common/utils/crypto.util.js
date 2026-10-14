"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoUtil = void 0;
const crypto = require("crypto");
class CryptoUtil {
    static generateStreamToken(payload, secret) {
        const rawData = `${payload.userId}:${payload.lessonId}:${payload.expiresAt}:${payload.clientIp}`;
        const base64Data = Buffer.from(rawData).toString('base64url');
        const signature = crypto
            .createHmac('sha256', secret)
            .update(base64Data)
            .digest('hex');
        return `${base64Data}.${signature}`;
    }
    static verifyStreamToken(token, secret, expectedLessonId, expectedUserId) {
        if (!token || !token.includes('.')) {
            return { valid: false, error: 'تنسيق رمز البث غير صالح' };
        }
        const [base64Data, signature] = token.split('.');
        if (!base64Data || !signature) {
            return { valid: false, error: 'رمز البث غير مكتمل' };
        }
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(base64Data)
            .digest('hex');
        const isSignatureValid = crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
        if (!isSignatureValid) {
            return { valid: false, error: 'توقيع رمز البث غير صالح ومرفوض أمنياً' };
        }
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
        }
        catch {
            return { valid: false, error: 'تعذر فك تشفير حمولة رمز البث' };
        }
    }
    static sha256(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }
}
exports.CryptoUtil = CryptoUtil;
//# sourceMappingURL=crypto.util.js.map