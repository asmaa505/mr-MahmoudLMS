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
exports.CreateExamDto = void 0;
const class_validator_1 = require("class-validator");
class CreateExamDto {
    title;
    duration;
    passingScore;
    isMandatory;
    chapterId;
}
exports.CreateExamDto = CreateExamDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'عنوان الاختبار مطلوب' }),
    (0, class_validator_1.IsString)({ message: 'عنوان الاختبار يجب أن يكون نصاً' }),
    __metadata("design:type", String)
], CreateExamDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'مدة الاختبار بالدقائق مطلوبة' }),
    (0, class_validator_1.IsInt)({ message: 'مدة الاختبار يجب أن تكون رقماً صحيحاً' }),
    (0, class_validator_1.Min)(1, { message: 'مدة الاختبار يجب ألا تقل عن دقيقة واحدة' }),
    (0, class_validator_1.Max)(300, { message: 'مدة الاختبار لا تتجاوز 300 دقيقة' }),
    __metadata("design:type", Number)
], CreateExamDto.prototype, "duration", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: 'درجة النجاح يجب أن تكون رقماً صحيحاً' }),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateExamDto.prototype, "passingScore", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)({ message: 'حالة إجبارية الاختبار يجب أن تكون قيمة منطقية' }),
    __metadata("design:type", Boolean)
], CreateExamDto.prototype, "isMandatory", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'معرف الفصل الدراسي مطلوب' }),
    (0, class_validator_1.IsString)({ message: 'معرف الفصل يجب أن يكون نصاً' }),
    __metadata("design:type", String)
], CreateExamDto.prototype, "chapterId", void 0);
//# sourceMappingURL=create-exam.dto.js.map