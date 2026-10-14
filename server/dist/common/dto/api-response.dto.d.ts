export declare class ApiResponseDto<T> {
    success: boolean;
    statusCode: number;
    message: string;
    data: T | null;
    errorCode?: string | null;
    timestamp: string;
    constructor(success: boolean, statusCode: number, message: string, data?: T | null, errorCode?: string | null);
    static ok<T>(data: T, message?: string, statusCode?: number): ApiResponseDto<T>;
    static fail<T = null>(message: string, statusCode?: number, errorCode?: string | null, data?: T | null): ApiResponseDto<T>;
}
