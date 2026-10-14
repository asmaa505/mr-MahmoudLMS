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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoSecurityController = void 0;
const common_1 = require("@nestjs/common");
const video_security_service_1 = require("./video-security.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const device_restriction_guard_1 = require("../../common/guards/device-restriction.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let VideoSecurityController = class VideoSecurityController {
    videoSecurityService;
    constructor(videoSecurityService) {
        this.videoSecurityService = videoSecurityService;
    }
    async getSignedUrl(lessonId, user, req) {
        const rawIp = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
            req.socket.remoteAddress ||
            '127.0.0.1';
        const clientIp = rawIp.replace(/^.*:/, '');
        return this.videoSecurityService.generateSignedStreamUrl(lessonId, user, clientIp);
    }
    async getWatermarkData(lessonId, user, req) {
        const rawIp = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
            req.socket.remoteAddress ||
            '127.0.0.1';
        const clientIp = rawIp.replace(/^.*:/, '');
        return this.videoSecurityService.getWatermarkMetadata(lessonId, user, clientIp);
    }
    async streamVideo(lessonId, token, range, req, res) {
        const rawIp = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
            req.socket.remoteAddress ||
            '127.0.0.1';
        const clientIp = rawIp.replace(/^.*:/, '');
        return this.videoSecurityService.streamVideoFile(lessonId, token, range, clientIp, res);
    }
};
exports.VideoSecurityController = VideoSecurityController;
__decorate([
    (0, common_1.Get)('signed-url/:lessonId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, device_restriction_guard_1.DeviceRestrictionGuard),
    __param(0, (0, common_1.Param)('lessonId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], VideoSecurityController.prototype, "getSignedUrl", null);
__decorate([
    (0, common_1.Get)('watermark/:lessonId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, device_restriction_guard_1.DeviceRestrictionGuard),
    __param(0, (0, common_1.Param)('lessonId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], VideoSecurityController.prototype, "getWatermarkData", null);
__decorate([
    (0, common_1.Get)('stream/:lessonId'),
    __param(0, (0, common_1.Param)('lessonId')),
    __param(1, (0, common_1.Query)('token')),
    __param(2, (0, common_1.Headers)('range')),
    __param(3, (0, common_1.Req)()),
    __param(4, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], VideoSecurityController.prototype, "streamVideo", null);
exports.VideoSecurityController = VideoSecurityController = __decorate([
    (0, common_1.Controller)('videos'),
    __metadata("design:paramtypes", [video_security_service_1.VideoSecurityService])
], VideoSecurityController);
//# sourceMappingURL=video-security.controller.js.map