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
exports.AdminCreateUserDto = void 0;
const class_validator_1 = require("class-validator");
const role_enum_1 = require("../../../common/enums/role.enum");
class AdminCreateUserDto {
    name;
    phone;
    parentPhone;
    password;
    role;
    grade;
}
exports.AdminCreateUserDto = AdminCreateUserDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'الاسم مطلوب' }),
    (0, class_validator_1.IsString)({ message: 'الاسم يجب أن يكون نصاً' }),
    __metadata("design:type", String)
], AdminCreateUserDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'رقم الهاتف مطلوب' }),
    (0, class_validator_1.IsString)({ message: 'رقم الهاتف يجب أن يكون نصاً' }),
    (0, class_validator_1.Matches)(/^01[0125][0-9]{8}$/, {
        message: 'يرجى إدخال رقم هاتف مصري صحيح (11 رقماً يبدأ بـ 01)',
    }),
    __metadata("design:type", String)
], AdminCreateUserDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'رقم ولي الأمر يجب أن يكون نصاً' }),
    (0, class_validator_1.Matches)(/^01[0125][0-9]{8}$/, {
        message: 'يرجى إدخال رقم ولي أمر مصري صحيح (11 رقماً يبدأ بـ 01)',
    }),
    __metadata("design:type", String)
], AdminCreateUserDto.prototype, "parentPhone", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'كلمة المرور مطلوبة' }),
    (0, class_validator_1.IsString)({ message: 'كلمة المرور يجب أن تكون نصاً' }),
    (0, class_validator_1.MinLength)(6, { message: 'يجب ألا تقل كلمة المرور عن 6 أحرف أو أرقام' }),
    __metadata("design:type", String)
], AdminCreateUserDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)([role_enum_1.Role.STUDENT, role_enum_1.Role.TEACHER, role_enum_1.Role.ADMIN]),
    __metadata("design:type", String)
], AdminCreateUserDto.prototype, "role", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'الصف الدراسي مطلوب' }),
    (0, class_validator_1.IsIn)(['1', '2', '3']),
    __metadata("design:type", String)
], AdminCreateUserDto.prototype, "grade", void 0);
//# sourceMappingURL=create-student.dto.js.map