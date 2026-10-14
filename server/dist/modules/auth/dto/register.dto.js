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
exports.RegisterDto = void 0;
const class_validator_1 = require("class-validator");
class RegisterDto {
    name;
    phone;
    parentPhone;
    password;
    grade;
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'الاسم مطلوب' }),
    (0, class_validator_1.IsString)({ message: 'الاسم يجب أن يكون نصاً' }),
    (0, class_validator_1.MinLength)(3, { message: 'يجب ألا يقل الاسم عن 3 أحرف' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'رقم الهاتف مطلوب' }),
    (0, class_validator_1.IsString)({ message: 'رقم الهاتف يجب أن يكون نصاً' }),
    (0, class_validator_1.Matches)(/^01[0125][0-9]{8}$/, {
        message: 'يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 01 ويتكون من 11 رقماً',
    }),
    __metadata("design:type", String)
], RegisterDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'رقم ولي الأمر مطلوب للمتابعة والتواصل' }),
    (0, class_validator_1.IsString)({ message: 'رقم ولي الأمر يجب أن يكون نصاً' }),
    (0, class_validator_1.Matches)(/^01[0125][0-9]{8}$/, {
        message: 'يرجى إدخال رقم ولي أمر مصري صحيح يبدأ بـ 01 ويتكون من 11 رقماً',
    }),
    __metadata("design:type", String)
], RegisterDto.prototype, "parentPhone", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'كلمة المرور مطلوبة' }),
    (0, class_validator_1.IsString)({ message: 'كلمة المرور يجب أن تكون نصاً' }),
    (0, class_validator_1.MinLength)(6, { message: 'يجب ألا تقل كلمة المرور عن 6 أحرف أو أرقام' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'الصف الدراسي مطلوب' }),
    (0, class_validator_1.IsIn)(['1', '2', '3'], {
        message: 'الصف الدراسي غير صالح: 1 (أولى ثانوي)، 2 (ثانية ثانوي)، 3 (ثالثة ثانوي)',
    }),
    __metadata("design:type", String)
], RegisterDto.prototype, "grade", void 0);
//# sourceMappingURL=register.dto.js.map