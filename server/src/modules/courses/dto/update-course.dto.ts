import { IsOptional, IsString, IsIn, IsBoolean } from 'class-validator';

export class UpdateCourseDto {
  @IsOptional()
  @IsString({ message: 'عنوان الكورس يجب أن يكون نصاً' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'الوصف يجب أن يكون نصاً' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'رابط صورة الكورس يجب أن يكون نصاً' })
  image?: string;

  @IsOptional()
  @IsIn(['1', '2', '3'], { message: 'الصف الدراسي غير صالح (1، 2، أو 3)' })
  grade?: string;

  @IsOptional()
  @IsBoolean({ message: 'حالة النشر يجب أن تكون قيمة منطقية' })
  isPublished?: boolean;
}
