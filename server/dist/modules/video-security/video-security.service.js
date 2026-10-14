"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var VideoSecurityService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoSecurityService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs = require("fs");
const path = require("path");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto_util_1 = require("../../common/utils/crypto.util");
const watermark_util_1 = require("../../common/utils/watermark.util");
const role_enum_1 = require("../../common/enums/role.enum");
const constants_1 = require("../../common/constants");
let VideoSecurityService = VideoSecurityService_1 = class VideoSecurityService {
    prisma;
    configService;
    logger = new common_1.Logger(VideoSecurityService_1.name);
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    get lessonModel() {
        return this.prisma.lesson || this.prisma.lecture;
    }
    async generateSignedStreamUrl(lessonId, user, clientIp) {
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
            throw new common_1.NotFoundException('المحاضرة غير موجودة');
        }
        if (!lesson.isFree && user.role === role_enum_1.Role.STUDENT) {
            const enrollment = await this.prisma.enrollment.findUnique({
                where: {
                    userId_courseId: {
                        userId: user.id,
                        courseId: lesson.chapter.courseId,
                    },
                },
            });
            if (!enrollment) {
                throw new common_1.ForbiddenException({
                    message: 'يجب الاشتراك في الكورس أولاً للحصول على رابط البث الآمن.',
                    errorCode: constants_1.ERROR_CODES.COURSE_NOT_ENROLLED,
                });
            }
        }
        const secretKey = this.configService.get('security.streamSecretKey', 'physics-secure-stream-hmac-key-2026-shahat-physics');
        const ttlSeconds = this.configService.get('security.signedUrlExpirationSeconds', 7200);
        const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
        const streamToken = crypto_util_1.CryptoUtil.generateStreamToken({
            userId: user.id,
            lessonId: lesson.id,
            clientIp,
            expiresAt,
        }, secretKey);
        const apiPrefix = this.configService.get('apiPrefix', 'api/v1');
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
    async getWatermarkMetadata(lessonId, user, clientIp) {
        const lessonExists = await this.lessonModel.findUnique({
            where: { id: lessonId },
            select: { id: true },
        });
        if (!lessonExists) {
            throw new common_1.NotFoundException('المحاضرة غير موجودة');
        }
        return watermark_util_1.WatermarkUtil.generateWatermarkData({
            studentId: user.id,
            studentName: user.name,
            studentPhone: user.phone,
            studentIp: clientIp,
        });
    }
    async streamVideoFile(lessonId, token, rangeHeader, clientIp, res) {
        const secretKey = this.configService.get('security.streamSecretKey', 'physics-secure-stream-hmac-key-2026-shahat-physics');
        const verification = crypto_util_1.CryptoUtil.verifyStreamToken(token, secretKey, lessonId);
        if (!verification.valid || !verification.payload) {
            throw new common_1.UnauthorizedException({
                message: verification.error || 'رمز البث غير صالح',
                errorCode: constants_1.ERROR_CODES.STREAM_TOKEN_INVALID,
            });
        }
        const lesson = await this.lessonModel.findUnique({
            where: { id: lessonId },
        });
        if (!lesson) {
            throw new common_1.NotFoundException('المحاضرة غير موجودة');
        }
        const videoUrl = lesson.videoUrl;
        if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
            return res.redirect(videoUrl);
        }
        const storageBase = path.resolve(process.cwd(), this.configService.get('security.videoStoragePath', 'public/uploads/videos'));
        let cleanFileName = videoUrl;
        if (cleanFileName.startsWith('/uploads/videos/')) {
            cleanFileName = cleanFileName.replace('/uploads/videos/', '');
        }
        else if (cleanFileName.startsWith('/uploads/')) {
            cleanFileName = cleanFileName.replace('/uploads/', '');
        }
        const resolvedFilePath = path.resolve(storageBase, cleanFileName);
        if (!resolvedFilePath.startsWith(storageBase)) {
            this.logger.warn(`Path traversal attempt blocked: ${resolvedFilePath}`);
            throw new common_1.ForbiddenException('محاولة غير مصرح بها للوصول إلى ملفات النظام');
        }
        if (!fs.existsSync(resolvedFilePath)) {
            this.logger.error(`Video file not found on disk: ${resolvedFilePath}`);
            throw new common_1.NotFoundException('ملف الفيديو غير موجود على الخادم');
        }
        const stat = fs.statSync(resolvedFilePath);
        const fileSize = stat.size;
        const mimeType = this.resolveMimeType(resolvedFilePath);
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
        }
        else {
            res.setHeader('Content-Length', fileSize);
            res.status(200);
            const fileStream = fs.createReadStream(resolvedFilePath);
            fileStream.pipe(res);
        }
    }
    resolveMimeType(filePath) {
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
};
exports.VideoSecurityService = VideoSecurityService;
exports.VideoSecurityService = VideoSecurityService = VideoSecurityService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], VideoSecurityService);
//# sourceMappingURL=video-security.service.js.map