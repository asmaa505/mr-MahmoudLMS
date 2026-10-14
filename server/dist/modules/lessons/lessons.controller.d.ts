import { LessonsService } from './lessons.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { AuthenticatedUser } from '../../common/interfaces/auth-payload.interface';
export declare class LessonsController {
    private readonly lessonsService;
    constructor(lessonsService: LessonsService);
    createChapter(dto: CreateChapterDto): Promise<{
        message: string;
        chapter: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            courseId: string;
            order: number;
        };
    }>;
    deleteChapter(id: string): Promise<{
        message: string;
    }>;
    createLesson(dto: CreateLessonDto): Promise<{
        message: string;
        lesson: any;
    }>;
    getLesson(id: string, user: AuthenticatedUser): Promise<any>;
    deleteLesson(id: string): Promise<{
        message: string;
    }>;
    createHomework(dto: CreateHomeworkDto): Promise<{
        message: string;
        homework: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            chapterId: string;
            pdfUrl: string;
        };
    }>;
    deleteHomework(id: string): Promise<{
        message: string;
    }>;
}
