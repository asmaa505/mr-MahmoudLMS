import { IsNotEmpty, IsString, IsInt, IsOptional, IsBoolean, Min } from 'class-validator';

export class TrackProgressDto {
  @IsNotEmpty({ message: 'معرف المحاضرة مطلوب' })
  @IsString({ message: 'معرف المحاضرة يجب أن يكون نصاً' })
  lessonId!: string;

  @IsNotEmpty({ message: 'عدد الثواني المشاهدة مطلوب' })
  @IsInt({ message: 'عدد الثواني المشاهدة يجب أن يكون رقماً صحيحاً' })
  @Min(0)
  watchedSeconds!: number;

  @IsNotEmpty({ message: 'إجمالي طول الفيديو بالثواني مطلوب' })
  @IsInt({ message: 'إجمالي طول الفيديو يجب أن يكون رقماً صحيحاً' })
  @Min(1)
  totalSeconds!: number;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}
