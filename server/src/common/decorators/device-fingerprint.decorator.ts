import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import * as crypto from 'crypto';
import { DeviceInfo } from '../interfaces/auth-payload.interface';

export const ExtractDeviceInfo = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): DeviceInfo => {
    const request = ctx.switchToHttp().getRequest();
    const headers = request.headers;

    // Direct header from client (if frontend sends a persistent canvas/localstorage UUID)
    const clientFingerprint = (headers['x-device-fingerprint'] as string) || '';

    // Fallback to IP + User-Agent SHA-256 fingerprint if client header not provided
    const userAgent = (headers['user-agent'] as string) || 'Unknown-Device';
    const rawIp =
      (headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      request.socket?.remoteAddress ||
      '127.0.0.1';

    // Normalize IPv6 mapped IPv4
    const ipAddress = rawIp.replace(/^.*:/, '');

    const generatedHash = crypto
      .createHash('sha256')
      .update(`${clientFingerprint}|${userAgent}`)
      .digest('hex');

    // Parse friendly device name
    let deviceName = 'مستعرض غير معروف';
    if (/android/i.test(userAgent)) deviceName = 'هاتف أندرويد';
    else if (/iphone|ipad|ipod/i.test(userAgent)) deviceName = 'هاتف آيفون / آيباد';
    else if (/windows/i.test(userAgent)) deviceName = 'جهاز كمبيوتر (Windows)';
    else if (/macintosh|mac os x/i.test(userAgent)) deviceName = 'جهاز ماك (macOS)';
    else if (/linux/i.test(userAgent)) deviceName = 'جهاز لينكس';

    return {
      fingerprint: generatedHash,
      ipAddress,
      userAgent,
      deviceName,
    };
  },
);
