import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { UnlockCourseDto } from './dto/unlock-course.dto';
import { AuthenticatedUser } from '../../common/interfaces/auth-payload.interface';
export declare class CoursesController {
    private readonly coursesService;
    constructor(coursesService: CoursesService);
    getAllCourses(grade?: string, user?: AuthenticatedUser): Promise<{
        isEnrolled: boolean;
        _count: {
            enrollments: number;
            chapters: number;
        };
        grade: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        image: string | null;
        isPublished: boolean;
    }[]>;
    getCourseById(id: string, user?: AuthenticatedUser): Promise<{
        isEnrolled: boolean;
        _count: {
            enrollments: number;
        };
        chapters: ({
            homeworks: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                title: string;
                chapterId: string;
                pdfUrl: string;
            }[];
            lessons: {
                id: string;
                createdAt: Date;
                title: string;
                order: number;
                duration: string | null;
                durationSeconds: number;
                isFree: boolean;
                chapterId: string;
            }[];
            quizzes: {
                id: string;
                _count: {
                    questions: number;
                };
                title: string;
                duration: number;
                passingScore: number;
                isMandatory: boolean;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            courseId: string;
            order: number;
        })[];
        grade: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        image: string | null;
        isPublished: boolean;
    }>;
    createCourse(dto: CreateCourseDto): Promise<{
        message: string;
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
    }>;
    updateCourse(id: string, dto: UpdateCourseDto): Promise<{
        message: string;
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
    }>;
    deleteCourse(id: string): Promise<{
        message: string;
    }>;
    unlockCourse(userId: string, dto: UnlockCourseDto): Promise<{
        message: string;
        enrollment: {
            id: string;
            userId: string;
            courseId: string;
            unlockedAt: Date;
        };
        courseId: string;
    }>;
    redeemCode(userId: string, dto: UnlockCourseDto): Promise<{
        message: string;
        enrollment: {
            id: string;
            userId: string;
            courseId: string;
            unlockedAt: Date;
        };
        courseId: string;
    }>;
}
