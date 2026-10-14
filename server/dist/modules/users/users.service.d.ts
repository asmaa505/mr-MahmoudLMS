import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AdminCreateUserDto } from './dto/create-student.dto';
export declare class UsersService {
    private readonly prisma;
    private readonly redisService;
    constructor(prisma: PrismaService, redisService: RedisService);
    findAllStudents(grade?: string, search?: string): Promise<{
        name: string;
        phone: string;
        parentPhone: string | null;
        grade: string;
        id: string;
        role: import(".prisma/client").$Enums.Role;
        isApproved: boolean;
        isBlocked: boolean;
        createdAt: Date;
        _count: {
            enrollments: number;
            quizAttempts: number;
        };
    }[]>;
    approveStudent(id: string): Promise<{
        message: string;
        user: {
            id: string;
            name: string;
            isApproved: boolean;
        };
    }>;
    toggleBlockStudent(id: string): Promise<{
        message: string;
        user: {
            id: string;
            name: string;
            isBlocked: boolean;
        };
    }>;
    resetStudentDevice(id: string): Promise<{
        message: string;
    }>;
    adminCreateUser(dto: AdminCreateUserDto): Promise<{
        message: string;
        user: {
            id: string;
            name: string;
            phone: string;
            parentPhone: string | null;
            role: import(".prisma/client").$Enums.Role;
            grade: string;
        };
    }>;
    deleteStudent(id: string): Promise<{
        message: string;
    }>;
}
