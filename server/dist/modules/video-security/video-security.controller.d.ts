import { Response, Request } from 'express';
import { VideoSecurityService } from './video-security.service';
import { AuthenticatedUser } from '../../common/interfaces/auth-payload.interface';
export declare class VideoSecurityController {
    private readonly videoSecurityService;
    constructor(videoSecurityService: VideoSecurityService);
    getSignedUrl(lessonId: string, user: AuthenticatedUser, req: Request): Promise<{
        lessonId: any;
        title: any;
        signedStreamUrl: string;
        streamToken: string;
        expiresAt: number;
        expiresInSeconds: number;
    }>;
    getWatermarkData(lessonId: string, user: AuthenticatedUser, req: Request): Promise<import("../../common/utils/watermark.util").WatermarkPayload>;
    streamVideo(lessonId: string, token: string, range: string | undefined, req: Request, res: Response): Promise<void | Response<any, Record<string, any>>>;
}
