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
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../prisma/prisma.service");
const constants_1 = require("../../../common/constants");
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy, 'jwt') {
    configService;
    prisma;
    constructor(configService, prisma) {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromExtractors([
                passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
                (req) => {
                    return req?.cookies?.auth_token || null;
                },
            ]),
            ignoreExpiration: false,
            secretOrKey: configService.get('jwt.accessSecret', 'physics-lms-super-secret-access-token-key-2026-el-shahat'),
        });
        this.configService = configService;
        this.prisma = prisma;
    }
    async validate(payload) {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            select: {
                id: true,
                name: true,
                phone: true,
                role: true,
                grade: true,
                isApproved: true,
                isBlocked: true,
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException({
                message: 'المستخدم صاحب هذا الرمز لم يعد موجوداً في النظام',
                errorCode: constants_1.ERROR_CODES.UNAUTHORIZED,
            });
        }
        if (user.isBlocked) {
            throw new common_1.UnauthorizedException({
                message: 'تم حظر حسابك. يرجى مراجعة الأستاذ محمود الشحات.',
                errorCode: constants_1.ERROR_CODES.ACCOUNT_BLOCKED,
            });
        }
        if (!user.isApproved && user.role === 'STUDENT') {
            throw new common_1.UnauthorizedException({
                message: 'حسابك ما زال قيد المراجعة والموافقة من قبل الأستاذ محمود الشحات.',
                errorCode: constants_1.ERROR_CODES.ACCOUNT_PENDING_APPROVAL,
            });
        }
        return {
            id: user.id,
            name: user.name,
            phone: user.phone,
            role: user.role,
            grade: user.grade,
            sessionId: payload.sessionId,
            deviceFingerprint: payload.deviceFingerprint,
        };
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], JwtStrategy);
//# sourceMappingURL=jwt.strategy.js.map