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
exports.CreateLessonDto = void 0;
const class_validator_1 = require("class-validator");
class CreateLessonDto {
    title;
    videoUrl;
    chapterId;
    duration;
    durationSeconds;
    order;
    isFree;
}
exports.CreateLessonDto = CreateLessonDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'عنوان المحاضرة مطلوب' }),
    (0, class_validator_1.IsString)({ message: 'عنوان المحاضرة يجب أن يكون نصاً' }),
    __metadata("design:type", String)
], CreateLessonDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'رابط أو اسم ملف الفيديو مطلوب' }),
    (0, class_validator_1.IsString)({ message: 'رابط الفيديو يجب أن يكون نصاً' }),
    __metadata("design:type", String)
], CreateLessonDto.prototype, "videoUrl", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'معرف الفصل مطلوب' }),
    (0, class_validator_1.IsString)({ message: 'معرف الفصل يجب أن يكون نصاً' }),
    __metadata("design:type", String)
], CreateLessonDto.prototype, "chapterId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'مدة الفيديو النصية (مثال 45:00)' }),
    __metadata("design:type", String)
], CreateLessonDto.prototype, "duration", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: 'مدة الفيديو بالثواني' }),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateLessonDto.prototype, "durationSeconds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: 'ترتيب المحاضرة داخل الفصل' }),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateLessonDto.prototype, "order", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)({ message: 'هل المحاضرة مجانية تجريبية؟' }),
    __metadata("design:type", Boolean)
], CreateLessonDto.prototype, "isFree", void 0);
//# sourceMappingURL=create-lesson.dto.js.map