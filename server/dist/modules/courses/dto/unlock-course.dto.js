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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnlockCourseDto = void 0;
const class_validator_1 = require("class-validator");
class UnlockCourseDto {
    code;
}
exports.UnlockCourseDto = UnlockCourseDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'كود التفعيل مطلوب' }),
    (0, class_validator_1.IsString)({ message: 'كود التفعيل يجب أن يكون نصاً' }),
    (0, class_validator_1.Length)(4, 30, { message: 'كود التفعيل غير صالح' }),
    __metadata("design:type", String)
], UnlockCourseDto.prototype, "code", void 0);
//# sourceMappingURL=unlock-course.dto.js.map