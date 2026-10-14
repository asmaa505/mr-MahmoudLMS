import { PrismaService } from '../prisma/prisma.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { AuthenticatedUser } from '../../common/interfaces/auth-payload.interface';
export declare class LessonsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
    deleteChapter(chapterId: string): Promise<{
        message: string;
    }>;
    private get lessonModel();
    createLesson(dto: CreateLessonDto): Promise<{
        message: string;
        lesson: any;
    }>;
    getLesson(lessonId: string, user: AuthenticatedUser): Promise<any>;
    deleteLesson(lessonId: string): Promise<{
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
    deleteHomework(homeworkId: string): Promise<{
        message: string;
    }>;
}
