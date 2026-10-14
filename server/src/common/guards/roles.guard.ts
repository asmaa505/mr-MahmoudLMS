import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { ROLES_KEY, ERROR_CODES } from '../constants';
import { AuthenticatedUser } from '../interfaces/auth-payload.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    if (!user) {
      throw new ForbiddenException({
        message: 'غير مصرح بالوصول إلى هذا المورد',
        errorCode: ERROR_CODES.FORBIDDEN,
      });
    }

    // Admins always have super-privileges
    if (user.role === Role.ADMIN) {
      return true;
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException({
        message: 'ليس لديك الصلاحيات الكافية للوصول إلى هذا المحتوى',
        errorCode: ERROR_CODES.FORBIDDEN,
      });
    }

    return true;
  }
}
