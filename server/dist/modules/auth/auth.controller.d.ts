import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { DeviceInfo, AuthenticatedUser } from '../../common/interfaces/auth-payload.interface';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
    refresh(dto: RefreshTokenDto, deviceInfo: DeviceInfo): Promise<{
        message: string;
        tokens: {
            accessToken: string;
            refreshToken: string;
            expiresIn: string;
        };
    }>;
    forgotPassword(dto: ForgotPasswordDto, req: any): Promise<{
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
    getProfile(user: AuthenticatedUser): Promise<{
        user: {
            id: string;
            name: string;
            phone: string;
            role: import("../../common/enums/role.enum").Role;
            grade: string;
        };
    }>;
}
