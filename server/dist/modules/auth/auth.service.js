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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
const mail_service_1 = require("./mail.service");
const constants_1 = require("../../common/constants");
const role_enum_1 = require("../../common/enums/role.enum");
let AuthService = AuthService_1 = class AuthService {
    prisma;
    redisService;
    jwtService;
    configService;
    mailService;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(prisma, redisService, jwtService, configService, mailService) {
        this.prisma = prisma;
        this.redisService = redisService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.mailService = mailService;
    }
    async register(dto) {
        const cleanPhone = dto.phone.trim();
        const cleanParentPhone = dto.parentPhone ? dto.parentPhone.trim() : null;
        if (cleanParentPhone && cleanPhone === cleanParentPhone) {
            throw new common_1.BadRequestException({
                message: 'رقم ولي الأمر يجب ألا يتطابق مع رقم هاتف الطالب لضمان دقة التواصل والمتابعة',
                errorCode: 'IDENTICAL_PHONE_NUMBERS',
            });
        }
        const existingUser = await this.prisma.user.findUnique({
            where: { phone: cleanPhone },
        });
        if (existingUser) {
            throw new common_1.ConflictException({
                message: 'رقم الهاتف مسجل بالفعل في المنصة. يرجى تسجيل الدخول أو استعادة الحساب.',
                errorCode: 'PHONE_ALREADY_EXISTS',
            });
        }
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const newUser = await this.prisma.user.create({
            data: {
                name: dto.name.trim(),
                phone: cleanPhone,
                parentPhone: cleanParentPhone,
                password: hashedPassword,
                grade: dto.grade,
                role: role_enum_1.Role.STUDENT,
                isApproved: false,
                isBlocked: false,
            },
            select: {
                id: true,
                name: true,
                phone: true,
                parentPhone: true,
                grade: true,
                role: true,
                isApproved: true,
                createdAt: true,
            },
        });
        return {
            message: 'تم إنشاء الحساب بنجاح! في انتظار موافقة الأستاذ محمود الشحات لتفعيل الحساب.',
            user: newUser,
        };
    }
    async login(dto, deviceInfo) {
        const cleanPhone = dto.phone.trim();
        const user = await this.prisma.user.findUnique({
            where: { phone: cleanPhone },
        });
        if (!user) {
            throw new common_1.UnauthorizedException({
                message: 'بيانات الدخول غير صحيحة (رقم الهاتف أو كلمة المرور)',
                errorCode: constants_1.ERROR_CODES.INVALID_CREDENTIALS,
            });
        }
        const isPasswordValid = await bcrypt.compare(dto.password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException({
                message: 'بيانات الدخول غير صحيحة (رقم الهاتف أو كلمة المرور)',
                errorCode: constants_1.ERROR_CODES.INVALID_CREDENTIALS,
            });
        }
        if (user.role === role_enum_1.Role.STUDENT) {
            if (user.isBlocked) {
                throw new common_1.ForbiddenException({
                    message: 'تم حظر حسابك. يرجى التواصل مع الأستاذ محمود الشحات لفك الحظر.',
                    errorCode: constants_1.ERROR_CODES.ACCOUNT_BLOCKED,
                });
            }
            if (!user.isApproved) {
                throw new common_1.ForbiddenException({
                    message: 'حسابك قيد المراجعة والانتظار لموافقة الأستاذ محمود الشحات.',
                    errorCode: constants_1.ERROR_CODES.ACCOUNT_PENDING_APPROVAL,
                });
            }
        }
        const deviceRestrictionMode = this.configService.get('security.deviceRestrictionMode', constants_1.DeviceRestrictionMode.REPLACE);
        const existingSession = await this.redisService.getActiveSession(user.id);
        if (existingSession && user.role === role_enum_1.Role.STUDENT) {
            if (deviceRestrictionMode === constants_1.DeviceRestrictionMode.BLOCK) {
                if (existingSession.deviceFingerprint !== deviceInfo.fingerprint) {
                    this.logger.warn(`Device block triggered for user ${user.id} from IP ${deviceInfo.ipAddress}`);
                    throw new common_1.ForbiddenException({
                        message: `حسابك مسجل ومرتبط بجهاز آخر (${existingSession.deviceName}). غير مسموح بالدخول من أجهزة متعددة. تواصل مع المعلم لإعادة تعيين جهازك.`,
                        errorCode: constants_1.ERROR_CODES.CONCURRENT_DEVICE_DETECTED,
                    });
                }
            }
            else {
                this.logger.log(`Replacing previous session for student ${user.id}. Invalidating old session.`);
                await this.redisService.invalidateActiveSession(user.id);
                if (this.prisma.deviceSession) {
                    await this.prisma.deviceSession.updateMany({
                        where: { userId: user.id, isRevoked: false },
                        data: { isRevoked: true },
                    });
                }
            }
        }
        const sessionId = crypto.randomUUID();
        const sessionData = {
            sessionId,
            userId: user.id,
            deviceFingerprint: deviceInfo.fingerprint,
            ipAddress: deviceInfo.ipAddress,
            userAgent: deviceInfo.userAgent,
            deviceName: deviceInfo.deviceName,
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
        };
        const sessionTtl = this.configService.get('security.sessionInactivityTimeoutSeconds', 86400);
        await this.redisService.setUserSession(user.id, sessionId, sessionTtl);
        await this.redisService.saveActiveSession(user.id, sessionData, sessionTtl);
        if (this.prisma.deviceSession) {
            await this.prisma.deviceSession.create({
                data: {
                    userId: user.id,
                    deviceFingerprint: deviceInfo.fingerprint,
                    userAgent: deviceInfo.userAgent,
                    ipAddress: deviceInfo.ipAddress,
                    deviceName: deviceInfo.deviceName,
                },
            });
        }
        try {
            await this.prisma.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() },
            });
        }
        catch { }
        const tokens = await this.generateTokens(user, sessionId, deviceInfo.fingerprint);
        const refreshTokenHash = crypto
            .createHash('sha256')
            .update(tokens.refreshToken)
            .digest('hex');
        await this.redisService.storeRefreshTokenHash(user.id, refreshTokenHash, 7 * 86400);
        return {
            message: 'تم تسجيل الدخول بنجاح',
            user: {
                id: user.id,
                name: user.name,
                phone: user.phone,
                role: user.role,
                grade: user.grade,
            },
            sessionId,
            tokens,
            session: {
                sessionId,
                deviceName: deviceInfo.deviceName,
                ipAddress: deviceInfo.ipAddress,
            },
        };
    }
    async refreshTokens(dto, deviceInfo) {
        const refreshSecret = this.configService.get('jwt.refreshSecret', 'physics-lms-super-secret-refresh-token-key-2026-el-shahat');
        let decoded;
        try {
            decoded = this.jwtService.verify(dto.refreshToken, {
                secret: refreshSecret,
            });
        }
        catch {
            throw new common_1.UnauthorizedException({
                message: 'رمز التحديث غير صالح أو منتهي الصلاحية',
                errorCode: constants_1.ERROR_CODES.TOKEN_EXPIRED,
            });
        }
        const userId = decoded.sub;
        const incomingHash = crypto
            .createHash('sha256')
            .update(dto.refreshToken)
            .digest('hex');
        const isValidStoredHash = await this.redisService.verifyRefreshTokenHash(userId, incomingHash);
        if (!isValidStoredHash) {
            this.logger.error(`Suspicious refresh token reuse detected for user ${userId}. Invalidating sessions.`);
            await this.redisService.invalidateActiveSession(userId);
            await this.redisService.revokeRefreshTokenHash(userId);
            throw new common_1.UnauthorizedException({
                message: 'تم رصد نشاط غير آمن في رمز التحديث. تم إنهاء الجلسة بالكامل لأسباب أمنية.',
                errorCode: constants_1.ERROR_CODES.DEVICE_REVOKED,
            });
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user || user.isBlocked) {
            throw new common_1.UnauthorizedException({
                message: 'الحساب غير متاح',
                errorCode: constants_1.ERROR_CODES.UNAUTHORIZED,
            });
        }
        const tokens = await this.generateTokens(user, decoded.sessionId, deviceInfo.fingerprint);
        const newRefreshHash = crypto
            .createHash('sha256')
            .update(tokens.refreshToken)
            .digest('hex');
        await this.redisService.storeRefreshTokenHash(userId, newRefreshHash, 7 * 86400);
        return {
            message: 'تم تجديد الجلسة بنجاح',
            tokens,
        };
    }
    async logout(userId) {
        await this.redisService.deleteUserSession(userId);
        await this.redisService.invalidateActiveSession(userId);
        await this.redisService.revokeRefreshTokenHash(userId);
        if (this.prisma.deviceSession) {
            await this.prisma.deviceSession.updateMany({
                where: { userId, isRevoked: false },
                data: { isRevoked: true },
            });
        }
        return {
            message: 'تم تسجيل الخروج بنجاح وإنهاء جلسة الجهاز.',
        };
    }
    async getActiveSession(userId) {
        const session = await this.redisService.getActiveSession(userId);
        if (!session) {
            return { active: false, session: null };
        }
        return {
            active: true,
            session: {
                sessionId: session.sessionId,
                deviceName: session.deviceName,
                ipAddress: session.ipAddress,
                createdAt: session.createdAt,
                lastActiveAt: session.lastActiveAt,
            },
        };
    }
    async forgotPassword(dto, clientIp) {
        const cleanEmail = dto.email.trim().toLowerCase();
        const ipCheck = await this.redisService.checkRateLimit(`pw_reset:ip:${clientIp}`, 3, 3600);
        const emailCheck = await this.redisService.checkRateLimit(`pw_reset:email:${cleanEmail}`, 3, 3600);
        if (!ipCheck.allowed || !emailCheck.allowed) {
            throw new common_1.HttpException({
                message: 'تم تجاوز الحد المسموح به من طلبات استعادة كلمة المرور (3 محاولات كل ساعة). يرجى المحاولة لاحقاً.',
                errorCode: 'RATE_LIMIT_EXCEEDED',
            }, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        const user = await this.prisma.user.findFirst({
            where: { email: cleanEmail },
        });
        if (!user) {
            throw new common_1.NotFoundException({
                message: 'البريد الإلكتروني غير مسجل بالمنصة',
                errorCode: 'EMAIL_NOT_FOUND',
            });
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await this.redisService.storeOtp(cleanEmail, otp, 900);
        await this.mailService.sendPasswordResetOtp(cleanEmail, otp, user.name);
        return {
            success: true,
            message: 'تم إرسال كود التحقق إلى بريدك الإلكتروني بنجاح',
        };
    }
    async verifyOtp(dto) {
        const cleanEmail = dto.email.trim().toLowerCase();
        const storedOtp = await this.redisService.getOtp(cleanEmail);
        if (!storedOtp || storedOtp.trim() !== dto.otp.trim()) {
            throw new common_1.BadRequestException({
                message: 'كود التحقق غير صحيح أو انتهت صلاحيته',
                errorCode: 'INVALID_OR_EXPIRED_OTP',
            });
        }
        return {
            success: true,
            message: 'تم التحقق من كود الاستعادة بنجاح',
        };
    }
    async resetPassword(dto) {
        const cleanEmail = dto.email.trim().toLowerCase();
        const storedOtp = await this.redisService.getOtp(cleanEmail);
        if (!storedOtp || storedOtp.trim() !== dto.otp.trim()) {
            throw new common_1.BadRequestException({
                message: 'كود التحقق غير صحيح أو انتهت صلاحيته',
                errorCode: 'INVALID_OR_EXPIRED_OTP',
            });
        }
        const user = await this.prisma.user.findFirst({
            where: { email: cleanEmail },
        });
        if (!user) {
            throw new common_1.NotFoundException({
                message: 'البريد الإلكتروني غير مسجل بالمنصة',
                errorCode: 'EMAIL_NOT_FOUND',
            });
        }
        const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });
        await this.redisService.deleteOtp(cleanEmail);
        await this.redisService.deleteUserSession(user.id);
        await this.redisService.invalidateActiveSession(user.id);
        await this.redisService.revokeRefreshTokenHash(user.id);
        if (this.prisma.deviceSession) {
            await this.prisma.deviceSession.updateMany({
                where: { userId: user.id, isRevoked: false },
                data: { isRevoked: true },
            });
        }
        return {
            success: true,
            message: 'تم تغيير كلمة السر بنجاح، يمكنك التسجيل الآن',
        };
    }
    async generateTokens(user, sessionId, deviceFingerprint) {
        const accessSecret = this.configService.get('jwt.accessSecret', 'physics-lms-super-secret-access-token-key-2026-el-shahat');
        const accessExpiresIn = this.configService.get('jwt.accessExpiresIn', '15m');
        const refreshSecret = this.configService.get('jwt.refreshSecret', 'physics-lms-super-secret-refresh-token-key-2026-el-shahat');
        const refreshExpiresIn = this.configService.get('jwt.refreshExpiresIn', '7d');
        const payload = {
            sub: user.id,
            phone: user.phone,
            name: user.name,
            role: user.role,
            grade: user.grade,
            sessionId,
            deviceFingerprint,
        };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: accessSecret,
                expiresIn: accessExpiresIn,
            }),
            this.jwtService.signAsync(payload, {
                secret: refreshSecret,
                expiresIn: refreshExpiresIn,
            }),
        ]);
        return {
            accessToken,
            refreshToken,
            expiresIn: accessExpiresIn,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        jwt_1.JwtService,
        config_1.ConfigService,
        mail_service_1.MailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map