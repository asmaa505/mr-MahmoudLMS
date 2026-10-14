"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AllExceptionsFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("../constants");
let AllExceptionsFilter = AllExceptionsFilter_1 = class AllExceptionsFilter {
    logger = new common_1.Logger(AllExceptionsFilter_1.name);
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'حدث خطأ غير متوقع في الخادم. يرجى المحاولة لاحقاً.';
        let errorCode = 'INTERNAL_ERROR';
        let details = null;
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const res = exception.getResponse();
            if (typeof res === 'string') {
                message = res;
            }
            else if (typeof res === 'object' && res !== null) {
                const resObj = res;
                message = resObj.message || exception.message;
                errorCode = resObj.errorCode || this.mapStatusToErrorCode(status);
                if (Array.isArray(resObj.message)) {
                    message = 'بيانات الإدخال غير صالحة';
                    details = resObj.message;
                }
            }
        }
        else if (exception instanceof Error) {
            message = exception.message;
            this.logger.error(`Unhandled Exception on ${request.method} ${request.url}: ${exception.message}`, exception.stack);
        }
        else {
            this.logger.error(`Unknown exception on ${request.method} ${request.url}:`, exception);
        }
        const payload = {
            success: false,
            statusCode: status,
            message,
            errorCode,
            details,
            path: request.url,
            timestamp: new Date().toISOString(),
        };
        response.status(status).json(payload);
    }
    mapStatusToErrorCode(status) {
        switch (status) {
            case common_1.HttpStatus.UNAUTHORIZED:
                return constants_1.ERROR_CODES.UNAUTHORIZED;
            case common_1.HttpStatus.FORBIDDEN:
                return constants_1.ERROR_CODES.FORBIDDEN;
            case common_1.HttpStatus.BAD_REQUEST:
                return 'BAD_REQUEST';
            case common_1.HttpStatus.NOT_FOUND:
                return 'NOT_FOUND';
            case common_1.HttpStatus.CONFLICT:
                return 'CONFLICT';
            default:
                return 'ERROR';
        }
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = AllExceptionsFilter_1 = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=all-exceptions.filter.js.map