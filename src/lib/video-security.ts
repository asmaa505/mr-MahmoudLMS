import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "mahmoud-el-shahat-physics-lms-super-secret-key-2026";

export interface VideoStreamTokenPayload {
  userId: string;
  lectureId: string;
  role: string;
  ip?: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate a short-lived (15 minutes) signed token for video streaming.
 * Prevents URL sharing, direct downloading via third-party tools, and unauthorized hotlinking.
 */
export function generateVideoStreamToken(userId: string, lectureId: string, role: string, ip?: string): string {
  return jwt.sign(
    {
      userId,
      lectureId,
      role,
      ip,
    },
    JWT_SECRET,
    { expiresIn: "15m" }
  );
}

/**
 * Verify signed video stream token.
 */
export function verifyVideoStreamToken(token: string): VideoStreamTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as VideoStreamTokenPayload;
  } catch (err) {
    return null;
  }
}
