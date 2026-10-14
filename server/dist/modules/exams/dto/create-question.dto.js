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
exports.CreateQuestionDto = void 0;
const class_validator_1 = require("class-validator");
class CreateQuestionDto {
    quizId;
    text;
    imageUrl;
    type;
    options;
    correctOption;
    explanation;
    points;
    order;
}
exports.CreateQuestionDto = CreateQuestionDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'معرف الاختبار مطلوب' }),
    (0, class_validator_1.IsString)({ message: 'معرف الاختبار يجب أن يكون نصاً' }),
    __metadata("design:type", String)
], CreateQuestionDto.prototype, "quizId", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'نص السؤال مطلوب' }),
    (0, class_validator_1.IsString)({ message: 'نص السؤال يجب أن يكون نصاً ويدعم صيغ LaTeX للفيزياء' }),
    __metadata("design:type", String)
], CreateQuestionDto.prototype, "text", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'رابط صورة المسألة أو الرسم البياني يجب أن يكون نصاً' }),
    __metadata("design:type", String)
], CreateQuestionDto.prototype, "imageUrl", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'نوع السؤال مطلوب' }),
    (0, class_validator_1.IsIn)(['MCQ', 'WRITTEN'], { message: 'نوع السؤال يجب أن يكون إما MCQ أو WRITTEN' }),
    __metadata("design:type", String)
], CreateQuestionDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)({ message: 'الخيارات يجب أن تكون مصفوفة نصية' }),
    (0, class_validator_1.IsString)({ each: true, message: 'كل خيار يجب أن يكون نصاً' }),
    __metadata("design:type", Array)
], CreateQuestionDto.prototype, "options", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: 'رقم الخيار الصحيح يجب أن يكون رقماً صحيحاً (يبدأ من 0)' }),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateQuestionDto.prototype, "correctOption", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'التفسير العلمي للحل الفيزيائي يجب أن يكون نصاً' }),
    __metadata("design:type", String)
], CreateQuestionDto.prototype, "explanation", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: 'درجة السؤال' }),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateQuestionDto.prototype, "points", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: 'ترتيب السؤال في الاختبار' }),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateQuestionDto.prototype, "order", void 0);
//# sourceMappingURL=create-question.dto.js.map