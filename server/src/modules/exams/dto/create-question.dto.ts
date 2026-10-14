import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  IsIn,
  IsArray,
  Min,
} from 'class-validator';

export class CreateQuestionDto {
  @IsNotEmpty({ message: 'معرف الاختبار مطلوب' })
  @IsString({ message: 'معرف الاختبار يجب أن يكون نصاً' })
  quizId!: string;

  @IsNotEmpty({ message: 'نص السؤال مطلوب' })
  @IsString({ message: 'نص السؤال يجب أن يكون نصاً ويدعم صيغ LaTeX للفيزياء' })
  text!: string;

  @IsOptional()
  @IsString({ message: 'رابط صورة المسألة أو الرسم البياني يجب أن يكون نصاً' })
  imageUrl?: string;

  @IsNotEmpty({ message: 'نوع السؤال مطلوب' })
  @IsIn(['MCQ', 'WRITTEN'], { message: 'نوع السؤال يجب أن يكون إما MCQ أو WRITTEN' })
  type!: 'MCQ' | 'WRITTEN';

  @IsOptional()
  @IsArray({ message: 'الخيارات يجب أن تكون مصفوفة نصية' })
  @IsString({ each: true, message: 'كل خيار يجب أن يكون نصاً' })
  options?: string[];

  @IsOptional()
  @IsInt({ message: 'رقم الخيار الصحيح يجب أن يكون رقماً صحيحاً (يبدأ من 0)' })
  @Min(0)
  correctOption?: number;

  @IsOptional()
  @IsString({ message: 'التفسير العلمي للحل الفيزيائي يجب أن يكون نصاً' })
  explanation?: string;

  @IsOptional()
  @IsInt({ message: 'درجة السؤال' })
  @Min(1)
  points?: number;

  @IsOptional()
  @IsInt({ message: 'ترتيب السؤال في الاختبار' })
  @Min(1)
  order?: number;
}
