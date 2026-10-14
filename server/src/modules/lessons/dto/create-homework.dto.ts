import { IsNotEmpty, IsString } from 'class-validator';

export class CreateHomeworkDto {
  @IsNotEmpty({ message: 'عنوان ملف الواجب مطلوب' })
  @IsString({ message: 'عنوان ملف الواجب يجب أن يكون نصاً' })
  title!: string;

  @IsNotEmpty({ message: 'رابط ملف الـ PDF مطلوب' })
  @IsString({ message: 'رابط الملف يجب أن يكون نصاً' })
  pdfUrl!: string;

  @IsNotEmpty({ message: 'معرف الفصل مطلوب' })
  @IsString({ message: 'معرف الفصل يجب أن يكون نصاً' })
  chapterId!: string;
}
