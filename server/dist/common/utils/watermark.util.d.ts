export interface WatermarkPayload {
    studentId: string;
    studentName: string;
    studentPhone: string;
    studentIp: string;
    issuedAt: string;
    displayIntervalSeconds: number;
    trajectorySeed: number;
    antiTamperChecksum: string;
}
export declare class WatermarkUtil {
    static generateWatermarkData(params: {
        studentId: string;
        studentName: string;
        studentPhone: string;
        studentIp: string;
    }): WatermarkPayload;
}
