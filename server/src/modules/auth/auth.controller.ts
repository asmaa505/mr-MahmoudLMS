import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ExtractDeviceInfo } from '../../common/decorators/device-fingerprint.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DeviceRestrictionGuard } from '../../common/guards/device-restriction.guard';
import { DeviceInfo, AuthenticatedUser } from '../../common/interfaces/auth-payload.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @ExtractDeviceInfo() deviceInfo: DeviceInfo,
  ) {
    return this.authService.login(dto, deviceInfo);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @ExtractDeviceInfo() deviceInfo: DeviceInfo,
  ) {
    return this.authService.refreshTokens(dto, deviceInfo);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: any) {
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || '127.0.0.1';
    return this.authService.forgotPassword(dto, clientIp);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser('id') userId: string) {
    return this.authService.logout(userId);
  }

  @Get('active-session')
  @UseGuards(JwtAuthGuard, DeviceRestrictionGuard)
  async getActiveSession(@CurrentUser('id') userId: string) {
    return this.authService.getActiveSession(userId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, DeviceRestrictionGuard)
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return {
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        grade: user.grade,
      },
    };
  }
}
