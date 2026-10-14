"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
const constants_1 = require("../../common/constants");
let RedisService = RedisService_1 = class RedisService {
    configService;
    logger = new common_1.Logger(RedisService_1.name);
    client;
    isConnected = false;
    constructor(configService) {
        this.configService = configService;
    }
    onModuleInit() {
        const host = this.configService.get('REDIS_HOST', 'localhost');
        const port = this.configService.get('REDIS_PORT', 6379);
        const password = this.configService.get('REDIS_PASSWORD', '');
        const db = this.configService.get('REDIS_DB', 0);
        const keyPrefix = this.configService.get('REDIS_KEY_PREFIX', 'physics_lms:');
        this.client = new ioredis_1.default({
            host,
            port,
            password: password || undefined,
            db,
            keyPrefix,
            lazyConnect: true,
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => {
                const delay = Math.min(times * 100, 3000);
                this.logger.warn(`Retrying connection to Redis (attempt #${times}) in ${delay}ms...`);
                return delay;
            },
        });
        this.client.on('connect', () => {
            this.isConnected = true;
            this.logger.log('Redis client connected successfully.');
        });
        this.client.on('error', (err) => {
            this.logger.error('Redis Client Error:', err);
        });
        this.client.connect().catch((err) => {
            this.logger.warn('Initial Redis connection failed (will retry in background):', err.message);
        });
    }
    async onModuleDestroy() {
        if (this.client) {
            await this.client.quit();
            this.logger.log('Redis client disconnected gracefully.');
        }
    }
    getClient() {
        return this.client;
    }
    async setUserSession(userId, sessionId, ttlSeconds = 86400) {
        const key = `${constants_1.REDIS_KEYS.USER_SESSION_PREFIX}${userId}`;
        await this.client.set(key, sessionId, 'EX', ttlSeconds);
    }
    async getUserSession(userId) {
        const key = `${constants_1.REDIS_KEYS.USER_SESSION_PREFIX}${userId}`;
        return this.client.get(key);
    }
    async deleteUserSession(userId) {
        const key = `${constants_1.REDIS_KEYS.USER_SESSION_PREFIX}${userId}`;
        await this.client.del(key);
    }
    async saveActiveSession(userId, session, ttlSeconds = 86400) {
        const key = `${constants_1.REDIS_KEYS.ACTIVE_SESSION_PREFIX}${userId}`;
        await this.client.set(key, JSON.stringify(session), 'EX', ttlSeconds);
    }
    async getActiveSession(userId) {
        const key = `${constants_1.REDIS_KEYS.ACTIVE_SESSION_PREFIX}${userId}`;
        const data = await this.client.get(key);
        if (!data)
            return null;
        try {
            return JSON.parse(data);
        }
        catch {
            return null;
        }
    }
    async invalidateActiveSession(userId) {
        const key = `${constants_1.REDIS_KEYS.ACTIVE_SESSION_PREFIX}${userId}`;
        await this.client.del(key);
    }
    async verifySessionIntegrity(userId, sessionId, deviceFingerprint) {
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
    async storeRefreshTokenHash(userId, tokenHash, ttlSeconds = 604800) {
        const key = `auth:refresh:${userId}`;
        await this.client.set(key, tokenHash, 'EX', ttlSeconds);
    }
    async verifyRefreshTokenHash(userId, tokenHash) {
        const key = `auth:refresh:${userId}`;
        const storedHash = await this.client.get(key);
        return storedHash === tokenHash;
    }
    async revokeRefreshTokenHash(userId) {
        const key = `auth:refresh:${userId}`;
        await this.client.del(key);
    }
    async blacklistToken(jti, ttlSeconds) {
        const key = `${constants_1.REDIS_KEYS.TOKEN_BLACKLIST_PREFIX}${jti}`;
        await this.client.set(key, '1', 'EX', ttlSeconds);
    }
    async isTokenBlacklisted(jti) {
        const key = `${constants_1.REDIS_KEYS.TOKEN_BLACKLIST_PREFIX}${jti}`;
        const exists = await this.client.exists(key);
        return exists === 1;
    }
    async acquireLock(lockKey, ttlMs = 5000) {
        const result = await this.client.set(lockKey, '1', 'PX', ttlMs, 'NX');
        return result === 'OK';
    }
    async releaseLock(lockKey) {
        await this.client.del(lockKey);
    }
    memoryOtpStore = new Map();
    async storeOtp(email, otp, ttlSeconds = 900) {
        const key = `reset_otp:${email.toLowerCase().trim()}`;
        try {
            if (this.client && this.client.status === 'ready') {
                await this.client.set(key, otp, 'EX', ttlSeconds);
                return;
            }
        }
        catch (e) {
            this.logger.warn(`Redis storeOtp failed, using fallback: ${e}`);
        }
        this.memoryOtpStore.set(key, { otp, expiresAt: Date.now() + ttlSeconds * 1000 });
    }
    async getOtp(email) {
        const key = `reset_otp:${email.toLowerCase().trim()}`;
        try {
            if (this.client && this.client.status === 'ready') {
                return await this.client.get(key);
            }
        }
        catch (e) {
            this.logger.warn(`Redis getOtp failed, using fallback: ${e}`);
        }
        const record = this.memoryOtpStore.get(key);
        if (!record)
            return null;
        if (Date.now() > record.expiresAt) {
            this.memoryOtpStore.delete(key);
            return null;
        }
        return record.otp;
    }
    async deleteOtp(email) {
        const key = `reset_otp:${email.toLowerCase().trim()}`;
        try {
            if (this.client && this.client.status === 'ready') {
                await this.client.del(key);
            }
        }
        catch (e) {
            this.logger.warn(`Redis deleteOtp failed: ${e}`);
        }
        this.memoryOtpStore.delete(key);
    }
    memoryRateLimit = new Map();
    async checkRateLimit(identifier, limit, windowSeconds) {
        const key = `${constants_1.REDIS_KEYS.RATE_LIMIT_PREFIX}${identifier}`;
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
        }
        catch (e) {
            this.logger.warn(`Redis checkRateLimit failed, using fallback: ${e}`);
        }
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
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RedisService);
//# sourceMappingURL=redis.service.js.map