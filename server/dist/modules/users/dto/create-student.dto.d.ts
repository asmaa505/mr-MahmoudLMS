import { Role } from '../../../common/enums/role.enum';
export declare class AdminCreateUserDto {
    name: string;
    phone: string;
    parentPhone?: string;
    password: string;
    role?: Role;
    grade: string;
}
