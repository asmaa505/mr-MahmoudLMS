import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisSessionData } from '../../common/interfaces/auth-payload.interface';
export declare class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly configService;
    private readonly logger;
    private client;
    private isConnected;
    constructor(configService: ConfigService);
    onModuleInit(): void;
    onModuleDestroy(): Promise<void>;
    getClient(): Redis;
    setUserSession(userId: string, sessionId: string, ttlSeconds?: number): Promise<void>;
    getUserSession(userId: string): Promise<string | null>;
    deleteUserSession(userId: string): Promise<void>;
    saveActiveSession(userId: string, session: RedisSessionData, ttlSeconds?: number): Promise<void>;
    getActiveSession(userId: string): Promise<RedisSessionData | null>;
    invalidateActiveSession(userId: string): Promise<void>;
    verifySessionIntegrity(userId: string, sessionId: string, deviceFingerprint: string): Promise<{
        valid: boolean;
        reason?: string;
    }>;
    storeRefreshTokenHash(userId: string, tokenHash: string, ttlSeconds?: number): Promise<void>;
    verifyRefreshTokenHash(userId: string, tokenHash: string): Promise<boolean>;
    revokeRefreshTokenHash(userId: string): Promise<void>;
    blacklistToken(jti: string, ttlSeconds: number): Promise<void>;
    isTokenBlacklisted(jti: string): Promise<boolean>;
    acquireLock(lockKey: string, ttlMs?: number): Promise<boolean>;
    releaseLock(lockKey: string): Promise<void>;
    private readonly memoryOtpStore;
    storeOtp(email: string, otp: string, ttlSeconds?: number): Promise<void>;
    getOtp(email: string): Promise<string | null>;
    deleteOtp(email: string): Promise<void>;
    private readonly memoryRateLimit;
    checkRateLimit(identifier: string, limit: number, windowSeconds: number): Promise<{
        allowed: boolean;
        remaining: number;
        resetIn: number;
    }>;
}
