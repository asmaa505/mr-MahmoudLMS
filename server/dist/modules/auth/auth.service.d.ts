import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailService } from './mail.service';
import { DeviceInfo } from '../../common/interfaces/auth-payload.interface';
export declare class AuthService {
    private readonly prisma;
    private readonly redisService;
    private readonly jwtService;
    private readonly configService;
    private readonly mailService;
    private readonly logger;
    constructor(prisma: PrismaService, redisService: RedisService, jwtService: JwtService, configService: ConfigService, mailService: MailService);
    register(dto: RegisterDto): Promise<{
        message: string;
        user: {
            name: string;
            phone: string;
            parentPhone: string | null;
            grade: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isApproved: boolean;
            createdAt: Date;
        };
    }>;
    login(dto: LoginDto, deviceInfo: DeviceInfo): Promise<{
        message: string;
        user: {
            id: string;
            name: string;
            phone: string;
            role: import(".prisma/client").$Enums.Role;
            grade: string;
        };
        sessionId: `${string}-${string}-${string}-${string}-${string}`;
        tokens: {
            accessToken: string;
            refreshToken: string;
            expiresIn: string;
        };
        session: {
            sessionId: `${string}-${string}-${string}-${string}-${string}`;
            deviceName: string;
            ipAddress: string;
        };
    }>;
    refreshTokens(dto: RefreshTokenDto, deviceInfo: DeviceInfo): Promise<{
        message: string;
        tokens: {
            accessToken: string;
            refreshToken: string;
            expiresIn: string;
        };
    }>;
    logout(userId: string): Promise<{
        message: string;
    }>;
    getActiveSession(userId: string): Promise<{
        active: boolean;
        session: null;
    } | {
        active: boolean;
        session: {
            sessionId: string;
            deviceName: string;
            ipAddress: string;
            createdAt: string;
            lastActiveAt: string;
        };
    }>;
    forgotPassword(dto: ForgotPasswordDto, clientIp: string): Promise<{
        success: boolean;
        message: string;
    }>;
    verifyOtp(dto: VerifyOtpDto): Promise<{
        success: boolean;
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        success: boolean;
        message: string;
    }>;
    private generateTokens;
}
