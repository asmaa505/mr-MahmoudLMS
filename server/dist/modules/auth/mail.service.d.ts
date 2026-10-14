import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private readonly configService;
    private readonly logger;
    private transporter;
    constructor(configService: ConfigService);
    sendPasswordResetOtp(email: string, otp: string, userName?: string): Promise<boolean>;
}
