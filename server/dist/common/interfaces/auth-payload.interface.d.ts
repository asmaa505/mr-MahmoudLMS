import { Role } from '../enums/role.enum';
export interface JwtPayload {
    sub: string;
    phone: string;
    name: string;
    role: Role;
    grade: string;
    sessionId: string;
    deviceFingerprint: string;
    iat?: number;
    exp?: number;
}
export interface AuthenticatedUser {
    id: string;
    phone: string;
    name: string;
    role: Role;
    grade: string;
    sessionId: string;
    deviceFingerprint: string;
}
export interface DeviceInfo {
    fingerprint: string;
    ipAddress: string;
    userAgent: string;
    deviceName: string;
}
export interface RedisSessionData {
    sessionId: string;
    userId: string;
    deviceFingerprint: string;
    ipAddress: string;
    userAgent: string;
    deviceName: string;
    createdAt: string;
    lastActiveAt: string;
}
