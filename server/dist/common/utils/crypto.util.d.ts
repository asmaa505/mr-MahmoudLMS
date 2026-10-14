export interface SignedStreamPayload {
    userId: string;
    lessonId: string;
    clientIp: string;
    expiresAt: number;
}
export declare class CryptoUtil {
    static generateStreamToken(payload: SignedStreamPayload, secret: string): string;
    static verifyStreamToken(token: string, secret: string, expectedLessonId: string, expectedUserId?: string): {
        valid: boolean;
        payload?: SignedStreamPayload;
        error?: string;
    };
    static sha256(data: string): string;
}
