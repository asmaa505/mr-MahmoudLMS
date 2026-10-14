import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsNotEmpty({ message: 'رمز التحديث (Refresh Token) مطلوب' })
  @IsString({ message: 'رمز التحديث يجب أن يكون نصاً' })
  refreshToken!: string;
}
