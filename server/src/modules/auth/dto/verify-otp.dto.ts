import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsNotEmpty({ message: 'يرجى إدخال البريد الإلكتروني' })
  @IsEmail({}, { message: 'صيغة البريد الإلكتروني غير صحيحة' })
  email!: string;

  @IsNotEmpty({ message: 'يرجى إدخال كود التحقق' })
  @IsString()
  @Length(4, 10, { message: 'كود التحقق غير صحيح' })
  otp!: string;
}
