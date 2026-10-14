import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsNotEmpty({ message: 'يرجى إدخال البريد الإلكتروني' })
  @IsEmail({}, { message: 'صيغة البريد الإلكتروني غير صحيحة' })
  email!: string;

  @IsNotEmpty({ message: 'يرجى إدخال كود التحقق' })
  @IsString()
  otp!: string;

  @IsNotEmpty({ message: 'يرجى إدخال كلمة المرور الجديدة' })
  @MinLength(8, { message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' })
  @Matches(/\d/, { message: 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل' })
  @Matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/, {
    message: 'كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل',
  })
  newPassword!: string;
}
