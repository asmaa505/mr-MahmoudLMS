export declare class CreateQuestionDto {
    quizId: string;
    text: string;
    imageUrl?: string;
    type: 'MCQ' | 'WRITTEN';
    options?: string[];
    correctOption?: number;
    explanation?: string;
    points?: number;
    order?: number;
}
