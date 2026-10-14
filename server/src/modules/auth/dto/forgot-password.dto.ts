import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @IsNotEmpty({ message: 'يرجى إدخال البريد الإلكتروني' })
  @IsEmail({}, { message: 'صيغة البريد الإلكتروني غير صحيحة' })
  email!: string;
}
