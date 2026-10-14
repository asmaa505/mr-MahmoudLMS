import { AuthenticatedUser } from '../interfaces/auth-payload.interface';
export declare const CurrentUser: (...dataOrPipes: (import("@nestjs/common").PipeTransform<any, any> | import("@nestjs/common").Type<import("@nestjs/common").PipeTransform<any, any>> | keyof AuthenticatedUser | undefined)[]) => ParameterDecorator;
