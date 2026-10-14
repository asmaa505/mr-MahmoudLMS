"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponseDto = void 0;
class ApiResponseDto {
    success;
    statusCode;
    message;
    data;
    errorCode;
    timestamp;
    constructor(success, statusCode, message, data = null, errorCode = null) {
        this.success = success;
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
        this.errorCode = errorCode;
        this.timestamp = new Date().toISOString();
    }
    static ok(data, message = 'Success', statusCode = 200) {
        return new ApiResponseDto(true, statusCode, message, data, null);
    }
    static fail(message, statusCode = 400, errorCode = null, data = null) {
        return new ApiResponseDto(false, statusCode, message, data, errorCode);
    }
}
exports.ApiResponseDto = ApiResponseDto;
//# sourceMappingURL=api-response.dto.js.map