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
var DeviceRestrictionGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceRestrictionGuard = void 0;
const common_1 = require("@nestjs/common");
const crypto = require("crypto");
const redis_service_1 = require("../../modules/redis/redis.service");
const role_enum_1 = require("../enums/role.enum");
const constants_1 = require("../constants");
let DeviceRestrictionGuard = DeviceRestrictionGuard_1 = class DeviceRestrictionGuard {
    redisService;
    logger = new common_1.Logger(DeviceRestrictionGuard_1.name);
    constructor(redisService) {
        this.redisService = redisService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            throw new common_1.UnauthorizedException({
                message: 'غير مصرح بالوصول: يرجى تسجيل الدخول',
                errorCode: constants_1.ERROR_CODES.UNAUTHORIZED,
            });
        }
        if (user.role === role_enum_1.Role.ADMIN || user.role === role_enum_1.Role.TEACHER) {
            return true;
        }
        const headers = request.headers;
        const clientFingerprint = headers['x-device-fingerprint'] || '';
        const userAgent = headers['user-agent'] || 'Unknown-Device';
        const rawIp = headers['x-forwarded-for']?.split(',')[0].trim() ||
            request.socket?.remoteAddress ||
            '127.0.0.1';
        const currentIp = rawIp.replace(/^.*:/, '');
        const currentCalculatedFingerprint = crypto
            .createHash('sha256')
            .update(`${clientFingerprint}|${userAgent}`)
            .digest('hex');
        const activeSession = await this.redisService.getActiveSession(user.id);
        if (!activeSession) {
            this.logger.warn(`Device guard rejected student ${user.id}: No active session in Redis`);
            throw new common_1.UnauthorizedException({
                message: 'انتهت جلستك أو تم تسجيل الخروج. يرجى تسجيل الدخول مجدداً.',
                errorCode: constants_1.ERROR_CODES.DEVICE_SESSION_EXPIRED,
            });
        }
        if (activeSession.sessionId !== user.sessionId) {
            this.logger.warn(`Device guard rejected student ${user.id}: Session mismatch. Token session=${user.sessionId}, Redis session=${activeSession.sessionId}`);
            throw new common_1.UnauthorizedException({
                message: 'تم تسجيل الدخول بحسابك من جهاز آخر. تم إنهاء الجلسة على هذا الجهاز لحماية الحساب.',
                errorCode: constants_1.ERROR_CODES.CONCURRENT_DEVICE_DETECTED,
            });
        }
        if (activeSession.deviceFingerprint !== currentCalculatedFingerprint) {
            this.logger.warn(`Device guard rejected student ${user.id}: Fingerprint mismatch! Stolen token detected.`);
            throw new common_1.UnauthorizedException({
                message: 'تم رصد نشاط غير مصرح به من متصفح أو جهاز غير متطابق مع الجلسة الحالية.',
                errorCode: constants_1.ERROR_CODES.DEVICE_REVOKED,
            });
        }
        activeSession.lastActiveAt = new Date().toISOString();
        activeSession.ipAddress = currentIp;
        this.redisService.saveActiveSession(user.id, activeSession).catch(() => { });
        return true;
    }
};
exports.DeviceRestrictionGuard = DeviceRestrictionGuard;
exports.DeviceRestrictionGuard = DeviceRestrictionGuard = DeviceRestrictionGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], DeviceRestrictionGuard);
//# sourceMappingURL=device-restriction.guard.js.map