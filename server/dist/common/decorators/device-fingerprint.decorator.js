"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtractDeviceInfo = void 0;
const common_1 = require("@nestjs/common");
const crypto = require("crypto");
exports.ExtractDeviceInfo = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const headers = request.headers;
    const clientFingerprint = headers['x-device-fingerprint'] || '';
    const userAgent = headers['user-agent'] || 'Unknown-Device';
    const rawIp = headers['x-forwarded-for']?.split(',')[0].trim() ||
        request.socket?.remoteAddress ||
        '127.0.0.1';
    const ipAddress = rawIp.replace(/^.*:/, '');
    const generatedHash = crypto
        .createHash('sha256')
        .update(`${clientFingerprint}|${userAgent}`)
        .digest('hex');
    let deviceName = 'مستعرض غير معروف';
    if (/android/i.test(userAgent))
        deviceName = 'هاتف أندرويد';
    else if (/iphone|ipad|ipod/i.test(userAgent))
        deviceName = 'هاتف آيفون / آيباد';
    else if (/windows/i.test(userAgent))
        deviceName = 'جهاز كمبيوتر (Windows)';
    else if (/macintosh|mac os x/i.test(userAgent))
        deviceName = 'جهاز ماك (macOS)';
    else if (/linux/i.test(userAgent))
        deviceName = 'جهاز لينكس';
    return {
        fingerprint: generatedHash,
        ipAddress,
        userAgent,
        deviceName,
    };
});
//# sourceMappingURL=device-fingerprint.decorator.js.map