import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_KEYS } from '../../common/constants';
import { RedisSessionData } from '../../common/interfaces/auth-payload.interface';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD', '');
    const db = this.configService.get<number>('REDIS_DB', 0);
    const keyPrefix = this.configService.get<string>('REDIS_KEY_PREFIX', 'physics_lms:');

    this.client = new Redis({
      host,
      port,
      password: password || undefined,
      db,
      keyPrefix,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 100, 3000);
        this.logger.warn(`Retrying connection to Redis (attempt #${times}) in ${delay}ms...`);
        return delay;
      },
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      this.logger.log('Redis client connected successfully.');
    });

    this.client.on('error', (err: Error) => {
      this.logger.error('Redis Client Error:', err);
    });

    this.client.connect().catch((err: Error) => {
      this.logger.warn('Initial Redis connection failed (will retry in background):', err.message);
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis client disconnected gracefully.');
    }
  }

  getClient(): Redis {
    return this.client;
  }

  // ---------------------------------------------------------------------------
  // DEVICE RESTRICTION & ACTIVE SESSION ENFORCEMENT
  // ---------------------------------------------------------------------------

  /**
   * Stores the single active sessionId for user under `user_session:{userId}`.
   * Any subsequent login overwrites this key with a new sessionId,
   * immediately invalidating the previous device.
   */
  async setUserSession(
    userId: string,
    sessionId: string,
    ttlSeconds = 86400,
  ): Promise<void> {
    const key = `${REDIS_KEYS.USER_SESSION_PREFIX}${userId}`;
    await this.client.set(key, sessionId, 'EX', ttlSeconds);
  }

  /**
   * Retrieves current active sessionId for user from `user_session:{userId}`.
   */
  async getUserSession(userId: string): Promise<string | null> {
    const key = `${REDIS_KEYS.USER_SESSION_PREFIX}${userId}`;
    return this.client.get(key);
  }

  /**
   * Deletes user session from Redis upon manual logout.
   */
  async deleteUserSession(userId: string): Promise<void> {
    const key = `${REDIS_KEYS.USER_SESSION_PREFIX}${userId}`;
    await this.client.del(key);
  }

  /**
   * Stores student active session metadata in Redis with TTL.
   */
  async saveActiveSession(
    userId: string,
    session: RedisSessionData,
    ttlSeconds = 86400, // 24 hours
  ): Promise<void> {
    const key = `${REDIS_KEYS.ACTIVE_SESSION_PREFIX}${userId}`;
    await this.client.set(key, JSON.stringify(session), 'EX', ttlSeconds);
  }

  /**
   * Retrieves student active session from Redis.
   */
  async getActiveSession(userId: string): Promise<RedisSessionData | null> {
    const key = `${REDIS_KEYS.ACTIVE_SESSION_PREFIX}${userId}`;
    const data = await this.client.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as RedisSessionData;
    } catch {
      return null;
    }
  }

  /**
   * Clears active session for student (forcing logout).
   */
  async invalidateActiveSession(userId: string): Promise<void> {
    const key = `${REDIS_KEYS.ACTIVE_SESSION_PREFIX}${userId}`;
    await this.client.del(key);
  }

  /**
   * Checks whether incoming request's fingerprint matches the active Redis session.
   */
  async verifySessionIntegrity(
    userId: string,
    sessionId: string,
    deviceFingerprint: string,
  ): Promise<{ valid: boolean; reason?: string }> {
    const activeSession = await this.getActiveSession(userId);

    if (!activeSession) {
      return { valid: false, reason: 'الجلسة منتهية أو تم تسجيل الخروج' };
    }

    if (activeSession.sessionId !== sessionId) {
      return {
        valid: false,
        reason: 'تم تسجيل الدخول من جهاز آخر. تم إنهاء جلستك السابقة للحماية.',
      };
    }

    if (activeSession.deviceFingerprint !== deviceFingerprint) {
      return {
        valid: false,
        reason: 'بصمة الجهاز غير مطابقة للجلسة النشطة. يرجى تسجيل الدخول مجدداً.',
      };
    }

    return { valid: true };
  }

  // ---------------------------------------------------------------------------
  // REFRESH TOKEN ROTATION & BLACKLISTING
  // ---------------------------------------------------------------------------

  /**
   * Stores hashed refresh token in Redis for strict rotation verification.
   */
  async storeRefreshTokenHash(
    userId: string,
    tokenHash: string,
    ttlSeconds = 604800, // 7 days
  ): Promise<void> {
    const key = `auth:refresh:${userId}`;
    await this.client.set(key, tokenHash, 'EX', ttlSeconds);
  }

  /**
   * Verifies that the incoming refresh token matches the currently active rotation token.
   */
  async verifyRefreshTokenHash(
    userId: string,
    tokenHash: string,
  ): Promise<boolean> {
    const key = `auth:refresh:${userId}`;
    const storedHash = await this.client.get(key);
    return storedHash === tokenHash;
  }

  /**
   * Revokes refresh token in Redis.
   */
  async revokeRefreshTokenHash(userId: string): Promise<void> {
    const key = `auth:refresh:${userId}`;
    await this.client.del(key);
  }

  /**
   * Blacklists a revoked JWT ID until its natural expiration.
   */
  async blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
    const key = `${REDIS_KEYS.TOKEN_BLACKLIST_PREFIX}${jti}`;
    await this.client.set(key, '1', 'EX', ttlSeconds);
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    const key = `${REDIS_KEYS.TOKEN_BLACKLIST_PREFIX}${jti}`;
    const exists = await this.client.exists(key);
    return exists === 1;
  }

  // ---------------------------------------------------------------------------
  // DISTRIBUTED LOCKS (FOR HIGH-LOAD CONCURRENCY / PEAK EXAM SUBMISSIONS)
  // ---------------------------------------------------------------------------

  /**
   * Acquires an atomic lock using SET NX PX.
   */
  async acquireLock(lockKey: string, ttlMs = 5000): Promise<boolean> {
    const result = await this.client.set(lockKey, '1', 'PX', ttlMs, 'NX');
    return result === 'OK';
  }

  /**
   * Releases an atomic lock.
   */
  async releaseLock(lockKey: string): Promise<void> {
    await this.client.del(lockKey);
  }

  // ---------------------------------------------------------------------------
  // OTP FOR PASSWORD RESET
  // ---------------------------------------------------------------------------
  private readonly memoryOtpStore = new Map<string, { otp: string; expiresAt: number }>();

  /**
   * Stores 6-digit OTP code in Redis under `reset_otp:{email}` with 900 seconds TTL.
   */
  async storeOtp(email: string, otp: string, ttlSeconds = 900): Promise<void> {
    const key = `reset_otp:${email.toLowerCase().trim()}`;
    try {
      if (this.client && this.client.status === 'ready') {
        await this.client.set(key, otp, 'EX', ttlSeconds);
        return;
      }
    } catch (e) {
      this.logger.warn(`Redis storeOtp failed, using fallback: ${e}`);
    }
    this.memoryOtpStore.set(key, { otp, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  /**
   * Retrieves 6-digit OTP code from Redis under `reset_otp:{email}`.
   */
  async getOtp(email: string): Promise<string | null> {
    const key = `reset_otp:${email.toLowerCase().trim()}`;
    try {
      if (this.client && this.client.status === 'ready') {
        return await this.client.get(key);
      }
    } catch (e) {
      this.logger.warn(`Redis getOtp failed, using fallback: ${e}`);
    }
    const record = this.memoryOtpStore.get(key);
    if (!record) return null;
    if (Date.now() > record.expiresAt) {
      this.memoryOtpStore.delete(key);
      return null;
    }
    return record.otp;
  }

  /**
   * Deletes OTP code from Redis.
   */
  async deleteOtp(email: string): Promise<void> {
    const key = `reset_otp:${email.toLowerCase().trim()}`;
    try {
      if (this.client && this.client.status === 'ready') {
        await this.client.del(key);
      }
    } catch (e) {
      this.logger.warn(`Redis deleteOtp failed: ${e}`);
    }
    this.memoryOtpStore.delete(key);
  }

  // ---------------------------------------------------------------------------
  // RATE LIMITING
  // ---------------------------------------------------------------------------

  /**
   * Sliding window rate limiter in Redis with in-memory fallback.
   */
  private readonly memoryRateLimit = new Map<string, { count: number; resetAt: number }>();

  async checkRateLimit(
    identifier: string,
    limit: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const key = `${REDIS_KEYS.RATE_LIMIT_PREFIX}${identifier}`;

    try {
      if (this.client && this.client.status === 'ready') {
        const current = await this.client.incr(key);
        if (current === 1) {
          await this.client.expire(key, windowSeconds);
        }
        const ttl = await this.client.ttl(key);
        if (current > limit) {
          return { allowed: false, remaining: 0, resetIn: ttl };
        }
        return {
          allowed: true,
          remaining: Math.max(0, limit - current),
          resetIn: ttl,
        };
      }
    } catch (e) {
      this.logger.warn(`Redis checkRateLimit failed, using fallback: ${e}`);
    }

    // In-memory fallback
    const now = Date.now();
    const entry = this.memoryRateLimit.get(key);
    if (!entry || now > entry.resetAt) {
      const resetAt = now + windowSeconds * 1000;
      this.memoryRateLimit.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: limit - 1, resetIn: windowSeconds };
    }

    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, resetIn: Math.ceil((entry.resetAt - now) / 1000) };
    }

    entry.count += 1;
    return {
      allowed: true,
      remaining: limit - entry.count,
      resetIn: Math.ceil((entry.resetAt - now) / 1000),
    };
  }
}
