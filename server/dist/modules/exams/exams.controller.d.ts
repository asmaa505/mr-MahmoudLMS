import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';
import { AuthenticatedUser } from '../../common/interfaces/auth-payload.interface';
export declare class ExamsController {
    private readonly examsService;
    constructor(examsService: ExamsService);
    createExam(dto: CreateExamDto): Promise<{
        message: string;
        quiz: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            duration: number;
            chapterId: string;
            passingScore: number;
            isMandatory: boolean;
        };
    }>;
    createQuestion(dto: CreateQuestionDto): Promise<{
        message: string;
        question: {
            type: import(".prisma/client").$Enums.QuestionType;
            options: string | null;
            id: string;
            order: number;
            quizId: string;
            text: string;
            imageUrl: string | null;
            correctOption: number | null;
            explanation: string | null;
            points: number;
        };
    }>;
    getExam(id: string, user: AuthenticatedUser): Promise<{
        id: string;
        title: string;
        duration: number;
        passingScore: number;
        isMandatory: boolean;
        questionsCount: number;
        questions: {
            id: any;
            text: any;
            imageUrl: any;
            type: any;
            options: string[];
            points: any;
            order: any;
        }[];
        previousAttempt: {
            score: number;
            passed: any;
            submittedAt: Date;
        } | null;
    } | {
        questions: any[];
        chapter: {
            course: {
                grade: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                title: string;
                description: string | null;
                image: string | null;
                isPublished: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            courseId: string;
            order: number;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        duration: number;
        chapterId: string;
        passingScore: number;
        isMandatory: boolean;
        questionsCount?: undefined;
        previousAttempt?: undefined;
    }>;
    submitExam(userId: string, dto: SubmitExamDto): Promise<{
        message: string;
        attemptId: string;
        score: number;
        passed: boolean;
        passingScore: any;
        totalQuestions: number;
        correctAnswersCount: number;
        review: {
            questionId: any;
            text: any;
            imageUrl: any;
            options: string[];
            studentAnswer: number | null;
            correctOption: any;
            isCorrect: boolean;
            explanation: any;
        }[];
    }>;
    getLeaderboard(id: string): Promise<{
        rank: number;
        studentName: string;
        score: number;
        passed: any;
        submittedAt: Date;
    }[]>;
}
