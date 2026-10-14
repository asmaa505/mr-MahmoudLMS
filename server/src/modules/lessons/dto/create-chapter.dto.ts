import { IsNotEmpty, IsString, IsInt, IsOptional, Min } from 'class-validator';

export class CreateChapterDto {
  @IsNotEmpty({ message: 'عنوان الفصل مطلوب' })
  @IsString({ message: 'عنوان الفصل يجب أن يكون نصاً' })
  title!: string;

  @IsNotEmpty({ message: 'معرف الكورس مطلوب' })
  @IsString({ message: 'معرف الكورس يجب أن يكون نصاً' })
  courseId!: string;

  @IsOptional()
  @IsInt({ message: 'ترتيب الفصل يجب أن يكون رقماً صحيحاً' })
  @Min(1)
  order?: number;
}
