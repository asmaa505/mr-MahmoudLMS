import { CanActivate, ExecutionContext } from '@nestjs/common';
import { RedisService } from '../../modules/redis/redis.service';
export declare class SingleSessionGuard implements CanActivate {
    private readonly redisService;
    private readonly logger;
    constructor(redisService: RedisService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
