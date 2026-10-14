import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { RedisService } from '../../modules/redis/redis.service';
import { AuthenticatedUser } from '../interfaces/auth-payload.interface';
import { Role } from '../enums/role.enum';
import { ERROR_CODES } from '../constants';

@Injectable()
export class SingleSessionGuard implements CanActivate {
  private readonly logger = new Logger(SingleSessionGuard.name);

  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    // Must be preceded by JwtAuthGuard so request.user is present
    if (!user || !user.id) {
      throw new UnauthorizedException({
        message: 'غير مصرح بالوصول: يرجى تسجيل الدخول أولاً.',
        errorCode: ERROR_CODES.UNAUTHORIZED,
      });
    }

    // Admins and Teachers can optionally be exempt from single-session restriction
    if (user.role === Role.ADMIN || user.role === Role.TEACHER) {
      return true;
    }

    // 1. Extract sessionId: prioritize x-session-id header, fallback to JWT payload
    const headerSessionId = (request.headers['x-session-id'] as string)?.trim();
    const incomingSessionId = headerSessionId || user.sessionId;

    if (!incomingSessionId) {
      this.logger.warn(`Request missing sessionId for user ${user.id}`);
      throw new UnauthorizedException({
        message: 'معرف الجلسة غير صالح أو مفقود. يرجى تسجيل الدخول مجدداً.',
        errorCode: ERROR_CODES.DEVICE_SESSION_EXPIRED,
      });
    }

    // 2. Fetch the current active sessionId from Redis (key: user_session:{userId})
    const activeSessionId = await this.redisService.getUserSession(user.id);

    // 3. Fallback check: check active session data object if stored in session:active:{userId}
    let resolvedActiveSessionId = activeSessionId;
    if (!resolvedActiveSessionId) {
      const activeSessionObj = await this.redisService.getActiveSession(user.id);
      resolvedActiveSessionId = activeSessionObj?.sessionId || null;
    }

    // 4. If no session exists in Redis, session was invalidated or expired
    if (!resolvedActiveSessionId) {
      this.logger.warn(`No active session found in Redis for user: ${user.id}`);
      throw new UnauthorizedException({
        message: 'تم تسجيل الدخول من جهاز آخر. تم إنهاء جلستك الحالية.',
        errorCode: ERROR_CODES.CONCURRENT_DEVICE_DETECTED,
      });
    }

    // 5. Compare incoming sessionId with active sessionId in Redis
    if (incomingSessionId !== resolvedActiveSessionId) {
      this.logger.warn(
        `Session mismatch for student ${user.id}! Incoming: ${incomingSessionId}, Active in Redis: ${resolvedActiveSessionId}`,
      );
      throw new UnauthorizedException({
        message: 'تم تسجيل الدخول من جهاز آخر. تم إنهاء جلستك الحالية.',
        errorCode: ERROR_CODES.CONCURRENT_DEVICE_DETECTED,
      });
    }

    return true;
  }
}
