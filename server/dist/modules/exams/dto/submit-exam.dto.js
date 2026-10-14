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
exports.SubmitExamDto = void 0;
const class_validator_1 = require("class-validator");
class SubmitExamDto {
    quizId;
    answers;
}
exports.SubmitExamDto = SubmitExamDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'معرف الاختبار مطلوب' }),
    (0, class_validator_1.IsString)({ message: 'معرف الاختبار يجب أن يكون نصاً' }),
    __metadata("design:type", String)
], SubmitExamDto.prototype, "quizId", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'إجابات الأسئلة مطلوبة' }),
    (0, class_validator_1.IsObject)({ message: 'الإجابات يجب أن تكون كائناً يحتوي على معرف السؤال وإجابة الطالب' }),
    __metadata("design:type", Object)
], SubmitExamDto.prototype, "answers", void 0);
//# sourceMappingURL=submit-exam.dto.js.map