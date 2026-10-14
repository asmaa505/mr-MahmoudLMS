import { IsNotEmpty, IsString, MinLength, Matches, IsIn, IsOptional } from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

export class AdminCreateUserDto {
  @IsNotEmpty({ message: 'الاسم مطلوب' })
  @IsString({ message: 'الاسم يجب أن يكون نصاً' })
  name!: string;

  @IsNotEmpty({ message: 'رقم الهاتف مطلوب' })
  @IsString({ message: 'رقم الهاتف يجب أن يكون نصاً' })
  @Matches(/^01[0125][0-9]{8}$/, {
    message: 'يرجى إدخال رقم هاتف مصري صحيح (11 رقماً يبدأ بـ 01)',
  })
  phone!: string;

  @IsOptional()
  @IsString({ message: 'رقم ولي الأمر يجب أن يكون نصاً' })
  @Matches(/^01[0125][0-9]{8}$/, {
    message: 'يرجى إدخال رقم ولي أمر مصري صحيح (11 رقماً يبدأ بـ 01)',
  })
  parentPhone?: string;

  @IsNotEmpty({ message: 'كلمة المرور مطلوبة' })
  @IsString({ message: 'كلمة المرور يجب أن تكون نصاً' })
  @MinLength(6, { message: 'يجب ألا تقل كلمة المرور عن 6 أحرف أو أرقام' })
  password!: string;

  @IsOptional()
  @IsIn([Role.STUDENT, Role.TEACHER, Role.ADMIN])
  role?: Role;

  @IsNotEmpty({ message: 'الصف الدراسي مطلوب' })
  @IsIn(['1', '2', '3'])
  grade!: string;
}
