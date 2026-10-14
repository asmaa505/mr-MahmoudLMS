import { IsNotEmpty, IsString, IsInt, IsOptional, IsBoolean, Min } from 'class-validator';

export class CreateLessonDto {
  @IsNotEmpty({ message: 'عنوان المحاضرة مطلوب' })
  @IsString({ message: 'عنوان المحاضرة يجب أن يكون نصاً' })
  title!: string;

  @IsNotEmpty({ message: 'رابط أو اسم ملف الفيديو مطلوب' })
  @IsString({ message: 'رابط الفيديو يجب أن يكون نصاً' })
  videoUrl!: string;

  @IsNotEmpty({ message: 'معرف الفصل مطلوب' })
  @IsString({ message: 'معرف الفصل يجب أن يكون نصاً' })
  chapterId!: string;

  @IsOptional()
  @IsString({ message: 'مدة الفيديو النصية (مثال 45:00)' })
  duration?: string;

  @IsOptional()
  @IsInt({ message: 'مدة الفيديو بالثواني' })
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @IsInt({ message: 'ترتيب المحاضرة داخل الفصل' })
  @Min(1)
  order?: number;

  @IsOptional()
  @IsBoolean({ message: 'هل المحاضرة مجانية تجريبية؟' })
  isFree?: boolean;
}
