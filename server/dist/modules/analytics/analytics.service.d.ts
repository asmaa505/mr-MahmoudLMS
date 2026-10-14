import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TrackProgressDto } from './dto/track-progress.dto';
export declare class AnalyticsService {
    private readonly prisma;
    private readonly redisService;
    constructor(prisma: PrismaService, redisService: RedisService);
    private get lessonModel();
    private get lessonProgressModel();
    trackProgress(userId: string, dto: TrackProgressDto): Promise<{
        message: string;
        isCompleted: any;
        progressPercent: number;
    }>;
    getStudentDashboard(userId: string): Promise<{
        student: {
            name: string;
            phone: string;
            grade: string;
            id: string;
            createdAt: Date;
        };
        overview: {
            enrolledCoursesCount: number;
            totalEnrolledLessons: number;
            completedLessonsCount: number;
            overallProgressPercent: number;
            totalWatchedHours: string;
            totalExamsTaken: number;
            passedExamsCount: number;
            averageExamScore: number;
        };
        recentExamAttempts: {
            quizTitle: any;
            score: any;
            passed: any;
            submittedAt: any;
        }[];
    }>;
    getTeacherDashboard(): Promise<{
        metrics: {
            totalStudents: number;
            pendingApprovals: number;
            blockedStudents: number;
            activeStudents: number;
            totalCourses: number;
            totalExamAttempts: number;
        };
        recentSubmissions: {
            studentName: any;
            studentPhone: any;
            quizTitle: any;
            score: any;
            passed: any;
            submittedAt: any;
        }[];
    }>;
    calculateStudentWeeklyReport(studentId: string, targetWeekNumber?: number): Promise<any>;
    generateWeeklyReportsBatch(): Promise<{
        message: string;
        totalStudents: number;
    }>;
}
