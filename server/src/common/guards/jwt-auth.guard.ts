import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ERROR_CODES } from '../constants';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = any>(err: any, user: any, info: any): TUser {
    if (err || !user) {
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException({
          message: 'انتهت صلاحية رمز الدخول. يرجى تجديد الجلسة.',
          errorCode: ERROR_CODES.TOKEN_EXPIRED,
        });
      }
      throw new UnauthorizedException({
        message: 'غير مصرح بالوصول: يرجى تسجيل الدخول أولاً.',
        errorCode: ERROR_CODES.UNAUTHORIZED,
      });
    }
    return user;
  }
}
