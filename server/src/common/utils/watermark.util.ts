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

export class WatermarkUtil {
  /**
   * Generates dynamic watermarking metadata bound to a specific student session.
   * Feeds the client-side VideoPlayer with anti-piracy identity indicators.
   */
  static generateWatermarkData(params: {
    studentId: string;
    studentName: string;
    studentPhone: string;
    studentIp: string;
  }): WatermarkPayload {
    const issuedAt = new Date().toISOString();
    const trajectorySeed = Math.floor(Math.random() * 1000000);

    // Simple anti-tamper checksum
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
