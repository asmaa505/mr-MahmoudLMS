import { IsNotEmpty, IsString, Length } from 'class-validator';

export class UnlockCourseDto {
  @IsNotEmpty({ message: 'كود التفعيل مطلوب' })
  @IsString({ message: 'كود التفعيل يجب أن يكون نصاً' })
  @Length(4, 30, { message: 'كود التفعيل غير صالح' })
  code!: string;
}
