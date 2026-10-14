export class ApiResponseDto<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T | null;
  errorCode?: string | null;
  timestamp: string;

  constructor(
    success: boolean,
    statusCode: number,
    message: string,
    data: T | null = null,
    errorCode: string | null = null,
  ) {
    this.success = success;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.errorCode = errorCode;
    this.timestamp = new Date().toISOString();
  }

  static ok<T>(data: T, message = 'Success', statusCode = 200): ApiResponseDto<T> {
    return new ApiResponseDto(true, statusCode, message, data, null);
  }

  static fail<T = null>(
    message: string,
    statusCode = 400,
    errorCode: string | null = null,
    data: T | null = null,
  ): ApiResponseDto<T> {
    return new ApiResponseDto(false, statusCode, message, data, errorCode);
  }
}
