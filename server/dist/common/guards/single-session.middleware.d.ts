import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
export interface AuthenticatedExpressRequest extends Request {
    user?: {
        id: string;
        role: string;
        sessionId?: string;
        [key: string]: any;
    };
}
export declare function createSingleSessionMiddleware(redisClient: Redis): (req: AuthenticatedExpressRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
