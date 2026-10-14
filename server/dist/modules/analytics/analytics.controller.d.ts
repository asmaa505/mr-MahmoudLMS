import { AnalyticsService } from './analytics.service';
import { TrackProgressDto } from './dto/track-progress.dto';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    trackProgress(userId: string, dto: TrackProgressDto): Promise<{
        message: string;
        isCompleted: any;
        progressPercent: number;
    }>;
    getStudentAnalytics(userId: string): Promise<{
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
    getTeacherAnalytics(): Promise<{
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
    generateAllWeeklyReports(): Promise<{
        message: string;
        totalStudents: number;
    }>;
    generateStudentWeeklyReport(studentId: string): Promise<any>;
}
