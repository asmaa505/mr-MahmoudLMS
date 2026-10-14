import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/interfaces/auth-payload.interface';
export declare class VideoSecurityService {
    private readonly prisma;
    private readonly configService;
    private readonly logger;
    constructor(prisma: PrismaService, configService: ConfigService);
    private get lessonModel();
    generateSignedStreamUrl(lessonId: string, user: AuthenticatedUser, clientIp: string): Promise<{
        lessonId: any;
        title: any;
        signedStreamUrl: string;
        streamToken: string;
        expiresAt: number;
        expiresInSeconds: number;
    }>;
    getWatermarkMetadata(lessonId: string, user: AuthenticatedUser, clientIp: string): Promise<import("../../common/utils/watermark.util").WatermarkPayload>;
    streamVideoFile(lessonId: string, token: string, rangeHeader: string | undefined, clientIp: string, res: Response): Promise<void | Response<any, Record<string, any>>>;
    private resolveMimeType;
}
