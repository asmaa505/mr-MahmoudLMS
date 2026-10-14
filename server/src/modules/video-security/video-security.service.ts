import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoUtil } from '../../common/utils/crypto.util';
import { WatermarkUtil } from '../../common/utils/watermark.util';
import { AuthenticatedUser } from '../../common/interfaces/auth-payload.interface';
import { Role } from '../../common/enums/role.enum';
import { ERROR_CODES } from '../../common/constants';

@Injectable()
export class VideoSecurityService {
  private readonly logger = new Logger(VideoSecurityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private get lessonModel(): any {
    return (this.prisma as any).lesson || (this.prisma as any).lecture;
  }

  /**
   * Generates a time-limited HMAC-SHA256 signed streaming token and URL for a lesson video.
   */
  async generateSignedStreamUrl(
    lessonId: string,
    user: AuthenticatedUser,
    clientIp: string,
  ) {
    // 1. Verify lesson exists and user has enrollment access
    const lesson = await this.lessonModel.findUnique({
      where: { id: lessonId },
      include: {
        chapter: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('المحاضرة غير موجودة');
    }

    if (!lesson.isFree && user.role === Role.STUDENT) {
      const enrollment = await this.prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId: lesson.chapter.courseId,
          },
        },
      });

      if (!enrollment) {
        throw new ForbiddenException({
          message: 'يجب الاشتراك في الكورس أولاً للحصول على رابط البث الآمن.',
          errorCode: ERROR_CODES.COURSE_NOT_ENROLLED,
        });
      }
    }

    // 2. Generate HMAC signed token
    const secretKey = this.configService.get<string>(
      'security.streamSecretKey',
      'physics-secure-stream-hmac-key-2026-shahat-physics',
    );
    const ttlSeconds = this.configService.get<number>(
      'security.signedUrlExpirationSeconds',
      7200, // 2 hours
    );
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;

    const streamToken = CryptoUtil.generateStreamToken(
      {
        userId: user.id,
        lessonId: lesson.id,
        clientIp,
        expiresAt,
      },
      secretKey,
    );

    const apiPrefix = this.configService.get<string>('apiPrefix', 'api/v1');
    const signedStreamUrl = `/${apiPrefix}/videos/stream/${lesson.id}?token=${streamToken}`;

    return {
      lessonId: lesson.id,
      title: lesson.title,
      signedStreamUrl,
      streamToken,
      expiresAt,
      expiresInSeconds: ttlSeconds,
    };
  }

  /**
   * Generates dynamic watermarking data bound to this student's identity.
   */
  async getWatermarkMetadata(
    lessonId: string,
    user: AuthenticatedUser,
    clientIp: string,
  ) {
    // Fast verification of lesson existence
    const lessonExists = await this.lessonModel.findUnique({
      where: { id: lessonId },
      select: { id: true },
    });

    if (!lessonExists) {
      throw new NotFoundException('المحاضرة غير موجودة');
    }

    return WatermarkUtil.generateWatermarkData({
      studentId: user.id,
      studentName: user.name,
      studentPhone: user.phone,
      studentIp: clientIp,
    });
  }

  /**
   * High-performance HTTP 206 Partial Content range stream handler with token verification.
   */
  async streamVideoFile(
    lessonId: string,
    token: string,
    rangeHeader: string | undefined,
    clientIp: string,
    res: Response,
  ) {
    // 1. Verify cryptographic token
    const secretKey = this.configService.get<string>(
      'security.streamSecretKey',
      'physics-secure-stream-hmac-key-2026-shahat-physics',
    );

    const verification = CryptoUtil.verifyStreamToken(token, secretKey, lessonId);
    if (!verification.valid || !verification.payload) {
      throw new UnauthorizedException({
        message: verification.error || 'رمز البث غير صالح',
        errorCode: ERROR_CODES.STREAM_TOKEN_INVALID,
      });
    }

    // 2. Fetch lesson record
    const lesson = await this.lessonModel.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('المحاضرة غير موجودة');
    }

    const videoUrl = lesson.videoUrl;

    // 3. Handle remote or cloud streams (e.g. S3, Vimeo, YouTube)
    if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
      return res.redirect(videoUrl);
    }

    // 4. Resolve local disk video file with path traversal defense
    const storageBase = path.resolve(
      process.cwd(),
      this.configService.get<string>('security.videoStoragePath', 'public/uploads/videos'),
    );

    let cleanFileName = videoUrl;
    if (cleanFileName.startsWith('/uploads/videos/')) {
      cleanFileName = cleanFileName.replace('/uploads/videos/', '');
    } else if (cleanFileName.startsWith('/uploads/')) {
      cleanFileName = cleanFileName.replace('/uploads/', '');
    }

    const resolvedFilePath = path.resolve(storageBase, cleanFileName);

    // Defense against path traversal attack (e.g. ../../etc/passwd)
    if (!resolvedFilePath.startsWith(storageBase)) {
      this.logger.warn(`Path traversal attempt blocked: ${resolvedFilePath}`);
      throw new ForbiddenException('محاولة غير مصرح بها للوصول إلى ملفات النظام');
    }

    if (!fs.existsSync(resolvedFilePath)) {
      this.logger.error(`Video file not found on disk: ${resolvedFilePath}`);
      throw new NotFoundException('ملف الفيديو غير موجود على الخادم');
    }

    // 5. Compute file statistics & Range headers
    const stat = fs.statSync(resolvedFilePath);
    const fileSize = stat.size;
    const mimeType = this.resolveMimeType(resolvedFilePath);

    // Set anti-download and anti-caching security headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        return res.status(416).send('Requested range not satisfiable');
      }

      const chunkSize = end - start + 1;
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', chunkSize);
      res.status(206);

      const fileStream = fs.createReadStream(resolvedFilePath, { start, end });
      fileStream.pipe(res);
    } else {
      res.setHeader('Content-Length', fileSize);
      res.status(200);

      const fileStream = fs.createReadStream(resolvedFilePath);
      fileStream.pipe(res);
    }
  }

  private resolveMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.mp4':
        return 'video/mp4';
      case '.webm':
        return 'video/webm';
      case '.ogg':
      case '.ogv':
        return 'video/ogg';
      case '.mov':
        return 'video/quicktime';
      case '.mkv':
        return 'video/x-matroska';
      default:
        return 'video/mp4';
    }
  }
}
