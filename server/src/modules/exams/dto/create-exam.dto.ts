import { IsNotEmpty, IsString, IsInt, IsOptional, IsBoolean, Min, Max } from 'class-validator';

export class CreateExamDto {
  @IsNotEmpty({ message: 'عنوان الاختبار مطلوب' })
  @IsString({ message: 'عنوان الاختبار يجب أن يكون نصاً' })
  title!: string;

  @IsNotEmpty({ message: 'مدة الاختبار بالدقائق مطلوبة' })
  @IsInt({ message: 'مدة الاختبار يجب أن تكون رقماً صحيحاً' })
  @Min(1, { message: 'مدة الاختبار يجب ألا تقل عن دقيقة واحدة' })
  @Max(300, { message: 'مدة الاختبار لا تتجاوز 300 دقيقة' })
  duration!: number;

  @IsOptional()
  @IsInt({ message: 'درجة النجاح يجب أن تكون رقماً صحيحاً' })
  @Min(0)
  @Max(100)
  passingScore?: number;

  @IsOptional()
  @IsBoolean({ message: 'حالة إجبارية الاختبار يجب أن تكون قيمة منطقية' })
  isMandatory?: boolean;

  @IsNotEmpty({ message: 'معرف الفصل الدراسي مطلوب' })
  @IsString({ message: 'معرف الفصل يجب أن يكون نصاً' })
  chapterId!: string;
}
