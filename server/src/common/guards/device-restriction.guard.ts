import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { RedisService } from '../../modules/redis/redis.service';
import { AuthenticatedUser } from '../interfaces/auth-payload.interface';
import { Role } from '../enums/role.enum';
import { ERROR_CODES } from '../constants';

@Injectable()
export class DeviceRestrictionGuard implements CanActivate {
  private readonly logger = new Logger(DeviceRestrictionGuard.name);

  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    // Must be preceded by JwtAuthGuard
    if (!user) {
      throw new UnauthorizedException({
        message: 'غير مصرح بالوصول: يرجى تسجيل الدخول',
        errorCode: ERROR_CODES.UNAUTHORIZED,
      });
    }

    // Admins and Teachers are exempt from single-device student locks
    if (user.role === Role.ADMIN || user.role === Role.TEACHER) {
      return true;
    }

    // Compute device fingerprint from current request
    const headers = request.headers;
    const clientFingerprint = (headers['x-device-fingerprint'] as string) || '';
    const userAgent = (headers['user-agent'] as string) || 'Unknown-Device';
    const rawIp =
      (headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      request.socket?.remoteAddress ||
      '127.0.0.1';
    const currentIp = rawIp.replace(/^.*:/, '');

    const currentCalculatedFingerprint = crypto
      .createHash('sha256')
      .update(`${clientFingerprint}|${userAgent}`)
      .digest('hex');

    // 1. Check Redis Active Session for this student
    const activeSession = await this.redisService.getActiveSession(user.id);

    if (!activeSession) {
      this.logger.warn(`Device guard rejected student ${user.id}: No active session in Redis`);
      throw new UnauthorizedException({
        message: 'انتهت جلستك أو تم تسجيل الخروج. يرجى تسجيل الدخول مجدداً.',
        errorCode: ERROR_CODES.DEVICE_SESSION_EXPIRED,
      });
    }

    // 2. Validate Session ID (Detect if replaced by newer login on another device)
    if (activeSession.sessionId !== user.sessionId) {
      this.logger.warn(
        `Device guard rejected student ${user.id}: Session mismatch. Token session=${user.sessionId}, Redis session=${activeSession.sessionId}`,
      );
      throw new UnauthorizedException({
        message: 'تم تسجيل الدخول بحسابك من جهاز آخر. تم إنهاء الجلسة على هذا الجهاز لحماية الحساب.',
        errorCode: ERROR_CODES.CONCURRENT_DEVICE_DETECTED,
      });
    }

    // 3. Validate Device Fingerprint (Detect stolen JWT token on different device/browser)
    if (activeSession.deviceFingerprint !== currentCalculatedFingerprint) {
      this.logger.warn(
        `Device guard rejected student ${user.id}: Fingerprint mismatch! Stolen token detected.`,
      );
      throw new UnauthorizedException({
        message: 'تم رصد نشاط غير مصرح به من متصفح أو جهاز غير متطابق مع الجلسة الحالية.',
        errorCode: ERROR_CODES.DEVICE_REVOKED,
      });
    }

    // Session is valid and healthy -> record last active heartbeat asynchronously
    activeSession.lastActiveAt = new Date().toISOString();
    activeSession.ipAddress = currentIp;
    this.redisService.saveActiveSession(user.id, activeSession).catch(() => {});

    return true;
  }
}
