import jwt from "jsonwebtoken";
import { getJwtSecret } from "./auth";

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
    getJwtSecret(),
    { expiresIn: "15m" }
  );
}

/**
 * Verify signed video stream token.
 */
export function verifyVideoStreamToken(token: string): VideoStreamTokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as VideoStreamTokenPayload;
  } catch (err) {
    return null;
  }
}
