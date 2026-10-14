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
var SingleSessionGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SingleSessionGuard = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../../modules/redis/redis.service");
const role_enum_1 = require("../enums/role.enum");
const constants_1 = require("../constants");
let SingleSessionGuard = SingleSessionGuard_1 = class SingleSessionGuard {
    redisService;
    logger = new common_1.Logger(SingleSessionGuard_1.name);
    constructor(redisService) {
        this.redisService = redisService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user || !user.id) {
            throw new common_1.UnauthorizedException({
                message: 'غير مصرح بالوصول: يرجى تسجيل الدخول أولاً.',
                errorCode: constants_1.ERROR_CODES.UNAUTHORIZED,
            });
        }
        if (user.role === role_enum_1.Role.ADMIN || user.role === role_enum_1.Role.TEACHER) {
            return true;
        }
        const headerSessionId = request.headers['x-session-id']?.trim();
        const incomingSessionId = headerSessionId || user.sessionId;
        if (!incomingSessionId) {
            this.logger.warn(`Request missing sessionId for user ${user.id}`);
            throw new common_1.UnauthorizedException({
                message: 'معرف الجلسة غير صالح أو مفقود. يرجى تسجيل الدخول مجدداً.',
                errorCode: constants_1.ERROR_CODES.DEVICE_SESSION_EXPIRED,
            });
        }
        const activeSessionId = await this.redisService.getUserSession(user.id);
        let resolvedActiveSessionId = activeSessionId;
        if (!resolvedActiveSessionId) {
            const activeSessionObj = await this.redisService.getActiveSession(user.id);
            resolvedActiveSessionId = activeSessionObj?.sessionId || null;
        }
        if (!resolvedActiveSessionId) {
            this.logger.warn(`No active session found in Redis for user: ${user.id}`);
            throw new common_1.UnauthorizedException({
                message: 'تم تسجيل الدخول من جهاز آخر. تم إنهاء جلستك الحالية.',
                errorCode: constants_1.ERROR_CODES.CONCURRENT_DEVICE_DETECTED,
            });
        }
        if (incomingSessionId !== resolvedActiveSessionId) {
            this.logger.warn(`Session mismatch for student ${user.id}! Incoming: ${incomingSessionId}, Active in Redis: ${resolvedActiveSessionId}`);
            throw new common_1.UnauthorizedException({
                message: 'تم تسجيل الدخول من جهاز آخر. تم إنهاء جلستك الحالية.',
                errorCode: constants_1.ERROR_CODES.CONCURRENT_DEVICE_DETECTED,
            });
        }
        return true;
    }
};
exports.SingleSessionGuard = SingleSessionGuard;
exports.SingleSessionGuard = SingleSessionGuard = SingleSessionGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], SingleSessionGuard);
//# sourceMappingURL=single-session.guard.js.map