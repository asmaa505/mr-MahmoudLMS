"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransformInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const api_response_dto_1 = require("../dto/api-response.dto");
let TransformInterceptor = class TransformInterceptor {
    intercept(context, next) {
        const http = context.switchToHttp();
        const response = http.getResponse();
        const statusCode = response.statusCode || 200;
        return next.handle().pipe((0, operators_1.map)((data) => {
            if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
                return data;
            }
            let message = 'تمت العملية بنجاح';
            let payload = data;
            if (data && typeof data === 'object' && 'message' in data && 'data' in data) {
                message = data.message;
                payload = data.data;
            }
            else if (data && typeof data === 'object' && 'message' in data && Object.keys(data).length === 1) {
                message = data.message;
                payload = null;
            }
            return new api_response_dto_1.ApiResponseDto(true, statusCode, message, payload, null);
        }));
    }
};
exports.TransformInterceptor = TransformInterceptor;
exports.TransformInterceptor = TransformInterceptor = __decorate([
    (0, common_1.Injectable)()
], TransformInterceptor);
//# sourceMappingURL=transform.interceptor.js.map