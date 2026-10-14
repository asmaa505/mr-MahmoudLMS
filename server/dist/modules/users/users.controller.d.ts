import { UsersService } from './users.service';
import { AdminCreateUserDto } from './dto/create-student.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getStudents(grade?: string, search?: string): Promise<{
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
    createStudent(dto: AdminCreateUserDto): Promise<{
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
    deleteStudent(id: string): Promise<{
        message: string;
    }>;
}
