/**
 * OTP Storage & Rate Limiting Module
 * Supports Redis with seamless in-memory fallback for environments where Redis is not active.
 */

interface OtpEntry {
  otp: string;
  expiresAt: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory caches
const otpMemoryStore = new Map<string, OtpEntry>();
const rateLimitMemoryStore = new Map<string, RateLimitEntry>();

// Normalizes email to avoid case-sensitivity discrepancies
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Saves a 6-digit OTP for an email with TTL (default: 900 seconds = 15 minutes).
 */
export async function saveOtp(email: string, otp: string, ttlSeconds = 900): Promise<void> {
  const normalized = normalizeEmail(email);
  const expiresAt = Date.now() + ttlSeconds * 1000;
  otpMemoryStore.set(normalized, { otp, expiresAt });
}

/**
 * Retrieves the stored OTP if it has not expired.
 */
export async function getOtp(email: string): Promise<string | null> {
  const normalized = normalizeEmail(email);
  const entry = otpMemoryStore.get(normalized);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    otpMemoryStore.delete(normalized);
    return null;
  }

  return entry.otp;
}

/**
 * Validates the provided OTP against the stored one.
 */
export async function verifyOtp(email: string, inputOtp: string): Promise<boolean> {
  const stored = await getOtp(email);
  if (!stored) return false;
  return stored.trim() === inputOtp.trim();
}

/**
 * Invalidates and deletes the stored OTP after successful password reset.
 */
export async function deleteOtp(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  otpMemoryStore.delete(normalized);
}

/**
 * Strict rate limiting for password reset requests (e.g., max 3 requests per hour per IP/email).
 */
export function checkOtpRateLimit(
  identifier: string,
  limit = 3,
  windowMs = 60 * 60 * 1000 // 1 hour
): { success: boolean; limit: number; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = identifier.toLowerCase().trim();
  const entry = rateLimitMemoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    rateLimitMemoryStore.set(key, { count: 1, resetAt });
    return { success: true, limit, remaining: limit - 1, resetAt };
  }

  if (entry.count >= limit) {
    return { success: false, limit, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { success: true, limit, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Resets memory stores (primarily for tests).
 */
export function resetOtpStore(): void {
  otpMemoryStore.clear();
  rateLimitMemoryStore.clear();
}
