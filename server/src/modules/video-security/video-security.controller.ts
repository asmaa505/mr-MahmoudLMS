import {
  Controller,
  Get,
  Param,
  Query,
  Headers,
  Res,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { VideoSecurityService } from './video-security.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DeviceRestrictionGuard } from '../../common/guards/device-restriction.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/auth-payload.interface';

@Controller('videos')
export class VideoSecurityController {
  constructor(private readonly videoSecurityService: VideoSecurityService) {}

  /**
   * Generates a time-limited signed URL token for student playback.
   */
  @Get('signed-url/:lessonId')
  @UseGuards(JwtAuthGuard, DeviceRestrictionGuard)
  async getSignedUrl(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const rawIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';
    const clientIp = rawIp.replace(/^.*:/, '');

    return this.videoSecurityService.generateSignedStreamUrl(
      lessonId,
      user,
      clientIp,
    );
  }

  /**
   * Generates dynamic watermarking overlay metadata.
   */
  @Get('watermark/:lessonId')
  @UseGuards(JwtAuthGuard, DeviceRestrictionGuard)
  async getWatermarkData(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const rawIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';
    const clientIp = rawIp.replace(/^.*:/, '');

    return this.videoSecurityService.getWatermarkMetadata(
      lessonId,
      user,
      clientIp,
    );
  }

  /**
   * Secure video streaming endpoint supporting HTTP 206 Partial Content.
   * Direct browser video tags load chunks from this endpoint using the HMAC signed token.
   */
  @Get('stream/:lessonId')
  async streamVideo(
    @Param('lessonId') lessonId: string,
    @Query('token') token: string,
    @Headers('range') range: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const rawIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';
    const clientIp = rawIp.replace(/^.*:/, '');

    return this.videoSecurityService.streamVideoFile(
      lessonId,
      token,
      range,
      clientIp,
      res,
    );
  }
}
