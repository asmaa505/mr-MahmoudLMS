"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WatermarkUtil = void 0;
class WatermarkUtil {
    static generateWatermarkData(params) {
        const issuedAt = new Date().toISOString();
        const trajectorySeed = Math.floor(Math.random() * 1000000);
        const raw = `${params.studentId}-${params.studentPhone}-${issuedAt}-${trajectorySeed}`;
        const antiTamperChecksum = Buffer.from(raw).toString('base64');
        return {
            studentId: params.studentId,
            studentName: params.studentName,
            studentPhone: params.studentPhone,
            studentIp: params.studentIp,
            issuedAt,
            displayIntervalSeconds: 4,
            trajectorySeed,
            antiTamperChecksum,
        };
    }
}
exports.WatermarkUtil = WatermarkUtil;
//# sourceMappingURL=watermark.util.js.map