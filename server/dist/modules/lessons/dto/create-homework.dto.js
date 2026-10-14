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
exports.CreateHomeworkDto = void 0;
const class_validator_1 = require("class-validator");
class CreateHomeworkDto {
    title;
    pdfUrl;
    chapterId;
}
exports.CreateHomeworkDto = CreateHomeworkDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'عنوان ملف الواجب مطلوب' }),
    (0, class_validator_1.IsString)({ message: 'عنوان ملف الواجب يجب أن يكون نصاً' }),
    __metadata("design:type", String)
], CreateHomeworkDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'رابط ملف الـ PDF مطلوب' }),
    (0, class_validator_1.IsString)({ message: 'رابط الملف يجب أن يكون نصاً' }),
    __metadata("design:type", String)
], CreateHomeworkDto.prototype, "pdfUrl", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'معرف الفصل مطلوب' }),
    (0, class_validator_1.IsString)({ message: 'معرف الفصل يجب أن يكون نصاً' }),
    __metadata("design:type", String)
], CreateHomeworkDto.prototype, "chapterId", void 0);
//# sourceMappingURL=create-homework.dto.js.map