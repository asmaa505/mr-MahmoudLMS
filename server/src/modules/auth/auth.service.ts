import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailService } from './mail.service';
import { DeviceInfo, RedisSessionData, JwtPayload } from '../../common/interfaces/auth-payload.interface';
import { ERROR_CODES, DeviceRestrictionMode } from '../../common/constants';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Register a new student account (pending teacher approval).
   */
  async register(dto: RegisterDto) {
    const cleanPhone = dto.phone.trim();
    const cleanParentPhone = dto.parentPhone ? dto.parentPhone.trim() : null;

    if (cleanParentPhone && cleanPhone === cleanParentPhone) {
      throw new BadRequestException({
        message: 'رقم ولي الأمر يجب ألا يتطابق مع رقم هاتف الطالب لضمان دقة التواصل والمتابعة',
        errorCode: 'IDENTICAL_PHONE_NUMBERS',
      });
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { phone: cleanPhone },
    });

    if (existingUser) {
      throw new ConflictException({
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
        role: Role.STUDENT,
        isApproved: false, // Students require approval from Mr. Mahmoud
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

  /**
   * Login with single-device restriction enforcement.
   */
  async login(dto: LoginDto, deviceInfo: DeviceInfo) {
    const cleanPhone = dto.phone.trim();

    // 1. Fetch user
    const user = await this.prisma.user.findUnique({
      where: { phone: cleanPhone },
    });

    if (!user) {
      throw new UnauthorizedException({
        message: 'بيانات الدخول غير صحيحة (رقم الهاتف أو كلمة المرور)',
        errorCode: ERROR_CODES.INVALID_CREDENTIALS,
      });
    }

    // 2. Validate password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        message: 'بيانات الدخول غير صحيحة (رقم الهاتف أو كلمة المرور)',
        errorCode: ERROR_CODES.INVALID_CREDENTIALS,
      });
    }

    // 3. Check student account restrictions
    if (user.role === Role.STUDENT) {
      if (user.isBlocked) {
        throw new ForbiddenException({
          message: 'تم حظر حسابك. يرجى التواصل مع الأستاذ محمود الشحات لفك الحظر.',
          errorCode: ERROR_CODES.ACCOUNT_BLOCKED,
        });
      }

      if (!user.isApproved) {
        throw new ForbiddenException({
          message: 'حسابك قيد المراجعة والانتظار لموافقة الأستاذ محمود الشحات.',
          errorCode: ERROR_CODES.ACCOUNT_PENDING_APPROVAL,
        });
      }
    }

    // 4. DEVICE RESTRICTION ENFORCEMENT VIA REDIS
    const deviceRestrictionMode = this.configService.get<string>(
      'security.deviceRestrictionMode',
      DeviceRestrictionMode.REPLACE,
    );

    const existingSession = await this.redisService.getActiveSession(user.id);

    if (existingSession && user.role === Role.STUDENT) {
      if (deviceRestrictionMode === DeviceRestrictionMode.BLOCK) {
        // Mode B: Hard-lock to initial device fingerprint
        if (existingSession.deviceFingerprint !== deviceInfo.fingerprint) {
          this.logger.warn(`Device block triggered for user ${user.id} from IP ${deviceInfo.ipAddress}`);
          throw new ForbiddenException({
            message: `حسابك مسجل ومرتبط بجهاز آخر (${existingSession.deviceName}). غير مسموح بالدخول من أجهزة متعددة. تواصل مع المعلم لإعادة تعيين جهازك.`,
            errorCode: ERROR_CODES.CONCURRENT_DEVICE_DETECTED,
          });
        }
      } else {
        // Mode A: REPLACE (Default) - Terminate previous active session
        this.logger.log(`Replacing previous session for student ${user.id}. Invalidating old session.`);
        await this.redisService.invalidateActiveSession(user.id);

        // Mark previous device session in DB as revoked
        if ((this.prisma as any).deviceSession) {
          await (this.prisma as any).deviceSession.updateMany({
            where: { userId: user.id, isRevoked: false },
            data: { isRevoked: true },
          });
        }
      }
    }

    // 5. Generate fresh session ID
    const sessionId = crypto.randomUUID();

    // 6. Save active session to Redis
    const sessionData: RedisSessionData = {
      sessionId,
      userId: user.id,
      deviceFingerprint: deviceInfo.fingerprint,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      deviceName: deviceInfo.deviceName,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };

    const sessionTtl = this.configService.get<number>('security.sessionInactivityTimeoutSeconds', 86400);
    // Explicitly set user_session:{userId} -> sessionId in Redis
    await this.redisService.setUserSession(user.id, sessionId, sessionTtl);
    await this.redisService.saveActiveSession(user.id, sessionData, sessionTtl);

    // 7. Record session in database
    if ((this.prisma as any).deviceSession) {
      await (this.prisma as any).deviceSession.create({
        data: {
          userId: user.id,
          deviceFingerprint: deviceInfo.fingerprint,
          userAgent: deviceInfo.userAgent,
          ipAddress: deviceInfo.ipAddress,
          deviceName: deviceInfo.deviceName,
        },
      });
    }

    // Update lastLoginAt if present in schema
    try {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() } as any,
      });
    } catch {}

    // 8. Generate Tokens (Access + Refresh)
    const tokens = await this.generateTokens(user, sessionId, deviceInfo.fingerprint);

    // 9. Store hashed Refresh Token in Redis for rotation
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

  /**
   * Rotate Refresh Token and issue new Access Token.
   */
  async refreshTokens(dto: RefreshTokenDto, deviceInfo: DeviceInfo) {
    const refreshSecret = this.configService.get<string>(
      'jwt.refreshSecret',
      'physics-lms-super-secret-refresh-token-key-2026-el-shahat',
    );

    let decoded: JwtPayload;
    try {
      decoded = this.jwtService.verify<JwtPayload>(dto.refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException({
        message: 'رمز التحديث غير صالح أو منتهي الصلاحية',
        errorCode: ERROR_CODES.TOKEN_EXPIRED,
      });
    }

    const userId = decoded.sub;

    // Verify refresh token hash in Redis
    const incomingHash = crypto
      .createHash('sha256')
      .update(dto.refreshToken)
      .digest('hex');

    const isValidStoredHash = await this.redisService.verifyRefreshTokenHash(
      userId,
      incomingHash,
    );

    if (!isValidStoredHash) {
      // Possible replay attack! Invalidate all sessions immediately!
      this.logger.error(`Suspicious refresh token reuse detected for user ${userId}. Invalidating sessions.`);
      await this.redisService.invalidateActiveSession(userId);
      await this.redisService.revokeRefreshTokenHash(userId);

      throw new UnauthorizedException({
        message: 'تم رصد نشاط غير آمن في رمز التحديث. تم إنهاء الجلسة بالكامل لأسباب أمنية.',
        errorCode: ERROR_CODES.DEVICE_REVOKED,
      });
    }

    // Verify user exists and status
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.isBlocked) {
      throw new UnauthorizedException({
        message: 'الحساب غير متاح',
        errorCode: ERROR_CODES.UNAUTHORIZED,
      });
    }

    // Issue rotated tokens
    const tokens = await this.generateTokens(
      user,
      decoded.sessionId,
      deviceInfo.fingerprint,
    );

    // Store new refresh token hash in Redis
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

  /**
   * Terminate active session and invalidate tokens.
   */
  async logout(userId: string) {
    await this.redisService.deleteUserSession(userId);
    await this.redisService.invalidateActiveSession(userId);
    await this.redisService.revokeRefreshTokenHash(userId);

    if ((this.prisma as any).deviceSession) {
      await (this.prisma as any).deviceSession.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });
    }

    return {
      message: 'تم تسجيل الخروج بنجاح وإنهاء جلسة الجهاز.',
    };
  }

  /**
   * Inspect current active session in Redis.
   */
  async getActiveSession(userId: string) {
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

  /**
   * Request password reset code via email with rate limiting and OTP generation.
   */
  async forgotPassword(dto: ForgotPasswordDto, clientIp: string) {
    const cleanEmail = dto.email.trim().toLowerCase();

    // AC7: Rate limiting (max 3 requests per hour)
    const ipCheck = await this.redisService.checkRateLimit(`pw_reset:ip:${clientIp}`, 3, 3600);
    const emailCheck = await this.redisService.checkRateLimit(`pw_reset:email:${cleanEmail}`, 3, 3600);

    if (!ipCheck.allowed || !emailCheck.allowed) {
      throw new HttpException(
        {
          message: 'تم تجاوز الحد المسموح به من طلبات استعادة كلمة المرور (3 محاولات كل ساعة). يرجى المحاولة لاحقاً.',
          errorCode: 'RATE_LIMIT_EXCEEDED',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // AC2: Verify email exists in DB
    const user = await this.prisma.user.findFirst({
      where: { email: cleanEmail },
    });

    if (!user) {
      throw new NotFoundException({
        message: 'البريد الإلكتروني غير مسجل بالمنصة',
        errorCode: 'EMAIL_NOT_FOUND',
      });
    }

    // Generate 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in Redis under reset_otp:{email} with 900s TTL
    await this.redisService.storeOtp(cleanEmail, otp, 900);

    // AC3: Send HTML email
    await this.mailService.sendPasswordResetOtp(cleanEmail, otp, user.name);

    return {
      success: true,
      message: 'تم إرسال كود التحقق إلى بريدك الإلكتروني بنجاح',
    };
  }

  /**
   * Validate 6-digit OTP code against Redis / storage.
   */
  async verifyOtp(dto: VerifyOtpDto) {
    const cleanEmail = dto.email.trim().toLowerCase();
    const storedOtp = await this.redisService.getOtp(cleanEmail);

    if (!storedOtp || storedOtp.trim() !== dto.otp.trim()) {
      throw new BadRequestException({
        message: 'كود التحقق غير صحيح أو انتهت صلاحيته',
        errorCode: 'INVALID_OR_EXPIRED_OTP',
      });
    }

    return {
      success: true,
      message: 'تم التحقق من كود الاستعادة بنجاح',
    };
  }

  /**
   * Update password in DB, invalidate OTP, and revoke existing sessions.
   */
  async resetPassword(dto: ResetPasswordDto) {
    const cleanEmail = dto.email.trim().toLowerCase();

    // Validate OTP
    const storedOtp = await this.redisService.getOtp(cleanEmail);
    if (!storedOtp || storedOtp.trim() !== dto.otp.trim()) {
      throw new BadRequestException({
        message: 'كود التحقق غير صحيح أو انتهت صلاحيته',
        errorCode: 'INVALID_OR_EXPIRED_OTP',
      });
    }

    // Lookup user
    const user = await this.prisma.user.findFirst({
      where: { email: cleanEmail },
    });

    if (!user) {
      throw new NotFoundException({
        message: 'البريد الإلكتروني غير مسجل بالمنصة',
        errorCode: 'EMAIL_NOT_FOUND',
      });
    }

    // Hash new password using bcrypt
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // Update in database via Prisma
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Invalidate OTP in Redis
    await this.redisService.deleteOtp(cleanEmail);

    // Revoke existing active sessions
    await this.redisService.deleteUserSession(user.id);
    await this.redisService.invalidateActiveSession(user.id);
    await this.redisService.revokeRefreshTokenHash(user.id);

    if ((this.prisma as any).deviceSession) {
      await (this.prisma as any).deviceSession.updateMany({
        where: { userId: user.id, isRevoked: false },
        data: { isRevoked: true },
      });
    }

    return {
      success: true,
      message: 'تم تغيير كلمة السر بنجاح، يمكنك التسجيل الآن',
    };
  }

  // Helper to sign access and refresh tokens
  private async generateTokens(
    user: { id: string; phone: string; name: string; role: any; grade: string },
    sessionId: string,
    deviceFingerprint: string,
  ) {
    const accessSecret = this.configService.get<string>(
      'jwt.accessSecret',
      'physics-lms-super-secret-access-token-key-2026-el-shahat',
    );
    const accessExpiresIn = this.configService.get<string>('jwt.accessExpiresIn', '15m');

    const refreshSecret = this.configService.get<string>(
      'jwt.refreshSecret',
      'physics-lms-super-secret-refresh-token-key-2026-el-shahat',
    );
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn', '7d');

    const payload: JwtPayload = {
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
        expiresIn: accessExpiresIn as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn as any,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresIn,
    };
  }
}
