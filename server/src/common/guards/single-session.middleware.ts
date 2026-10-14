import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

export interface AuthenticatedExpressRequest extends Request {
  user?: {
    id: string;
    role: string;
    sessionId?: string;
    [key: string]: any;
  };
}

/**
 * Express Middleware for Single-Device Session Enforcement.
 * Checks incoming `x-session-id` against active `user_session:{userId}` in Redis.
 */
export function createSingleSessionMiddleware(redisClient: Redis) {
  return async (
    req: AuthenticatedExpressRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = req.user;

      if (!user || !user.id) {
        return res.status(401).json({
          success: false,
          statusCode: 401,
          message: 'غير مصرح بالوصول: يرجى تسجيل الدخول أولاً.',
          errorCode: 'AUTH_001',
        });
      }

      // Bypass for Admins & Teachers
      if (user.role === 'ADMIN' || user.role === 'TEACHER') {
        return next();
      }

      // Extract sessionId from header or decoded JWT user
      const headerSessionId = (req.headers['x-session-id'] as string)?.trim();
      const incomingSessionId = headerSessionId || user.sessionId;

      if (!incomingSessionId) {
        return res.status(401).json({
          success: false,
          statusCode: 401,
          message: 'معرف الجلسة غير صالح أو مفقود. يرجى تسجيل الدخول مجدداً.',
          errorCode: 'AUTH_004',
        });
      }

      // Fetch active sessionId from Redis
      const redisKey = `user_session:${user.id}`;
      const activeSessionId = await redisClient.get(redisKey);

      if (!activeSessionId || activeSessionId !== incomingSessionId) {
        return res.status(401).json({
          success: false,
          statusCode: 401,
          message: 'تم تسجيل الدخول من جهاز آخر. تم إنهاء جلستك الحالية.',
          errorCode: 'AUTH_005',
        });
      }

      return next();
    } catch (error) {
      console.error('Error in singleSessionMiddleware:', error);
      return res.status(500).json({
        success: false,
        statusCode: 500,
        message: 'حدث خطأ أثناء التحقق من جلسة الجهاز',
      });
    }
  };
}
