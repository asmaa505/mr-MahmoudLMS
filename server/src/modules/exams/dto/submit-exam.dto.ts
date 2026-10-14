import { IsNotEmpty, IsString, IsObject } from 'class-validator';

export class SubmitExamDto {
  @IsNotEmpty({ message: 'معرف الاختبار مطلوب' })
  @IsString({ message: 'معرف الاختبار يجب أن يكون نصاً' })
  quizId!: string;

  @IsNotEmpty({ message: 'إجابات الأسئلة مطلوبة' })
  @IsObject({ message: 'الإجابات يجب أن تكون كائناً يحتوي على معرف السؤال وإجابة الطالب' })
  answers!: Record<string, number | string>;
}
