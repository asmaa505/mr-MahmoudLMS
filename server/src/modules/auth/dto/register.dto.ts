import { IsNotEmpty, IsString, MinLength, Matches, IsIn } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'الاسم مطلوب' })
  @IsString({ message: 'الاسم يجب أن يكون نصاً' })
  @MinLength(3, { message: 'يجب ألا يقل الاسم عن 3 أحرف' })
  name!: string;

  @IsNotEmpty({ message: 'رقم الهاتف مطلوب' })
  @IsString({ message: 'رقم الهاتف يجب أن يكون نصاً' })
  @Matches(/^01[0125][0-9]{8}$/, {
    message: 'يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 01 ويتكون من 11 رقماً',
  })
  phone!: string;

  @IsNotEmpty({ message: 'رقم ولي الأمر مطلوب للمتابعة والتواصل' })
  @IsString({ message: 'رقم ولي الأمر يجب أن يكون نصاً' })
  @Matches(/^01[0125][0-9]{8}$/, {
    message: 'يرجى إدخال رقم ولي أمر مصري صحيح يبدأ بـ 01 ويتكون من 11 رقماً',
  })
  parentPhone!: string;

  @IsNotEmpty({ message: 'كلمة المرور مطلوبة' })
  @IsString({ message: 'كلمة المرور يجب أن تكون نصاً' })
  @MinLength(6, { message: 'يجب ألا تقل كلمة المرور عن 6 أحرف أو أرقام' })
  password!: string;

  @IsNotEmpty({ message: 'الصف الدراسي مطلوب' })
  @IsIn(['1', '2', '3'], {
    message: 'الصف الدراسي غير صالح: 1 (أولى ثانوي)، 2 (ثانية ثانوي)، 3 (ثالثة ثانوي)',
  })
  grade!: string;
}
