import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, AuthenticatedUser } from '../../../common/interfaces/auth-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { ERROR_CODES } from '../../../common/constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req) => {
          // Fallback to cookie if present (supports legacy cookies from Next.js frontends)
          return req?.cookies?.auth_token || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'jwt.accessSecret',
        'physics-lms-super-secret-access-token-key-2026-el-shahat',
      ),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
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
      throw new UnauthorizedException({
        message: 'المستخدم صاحب هذا الرمز لم يعد موجوداً في النظام',
        errorCode: ERROR_CODES.UNAUTHORIZED,
      });
    }

    if (user.isBlocked) {
      throw new UnauthorizedException({
        message: 'تم حظر حسابك. يرجى مراجعة الأستاذ محمود الشحات.',
        errorCode: ERROR_CODES.ACCOUNT_BLOCKED,
      });
    }

    if (!user.isApproved && user.role === 'STUDENT') {
      throw new UnauthorizedException({
        message: 'حسابك ما زال قيد المراجعة والموافقة من قبل الأستاذ محمود الشحات.',
        errorCode: ERROR_CODES.ACCOUNT_PENDING_APPROVAL,
      });
    }

    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role as any,
      grade: user.grade,
      sessionId: payload.sessionId,
      deviceFingerprint: payload.deviceFingerprint,
    };
  }
}
