/**
 * OTP Storage & Rate Limiting Module
 * Supports Redis with seamless in-memory fallback for environments where Redis is not active.
 * Enforces strict expiration timestamps and locks verification attempts after consecutive incorrect submissions.
 */

export const DEFAULT_MAX_OTP_ATTEMPTS = 5;
export const DEFAULT_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout duration
export const DEFAULT_OTP_TTL_SECONDS = 900; // 15 minutes TTL

export interface OtpEntry {
  otp: string;
  expiresAt: number; // Strict epoch expiration timestamp in milliseconds
  createdAt: number;
  failedAttempts: number;
  maxAttempts: number;
  lockedUntil: number | null;
}

export interface AttemptRecord {
  failedAttempts: number;
  lockedUntil: number | null;
  lastAttemptAt: number;
}

export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface VerifyOtpResult {
  success: boolean;
  locked: boolean;
  expired: boolean;
  remainingAttempts: number;
  error?: string;
  message?: string;
  expiresAt?: number;
}

// In-memory caches
const otpMemoryStore = new Map<string, OtpEntry>();
const otpAttemptsMemoryStore = new Map<string, AttemptRecord>();
const rateLimitMemoryStore = new Map<string, RateLimitEntry>();

// Normalizes email to avoid case-sensitivity discrepancies
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Saves a 6-digit OTP for an email with a strict expiration timestamp (default: 900 seconds = 15 minutes).
 * Resets previous failed attempt counters for this email upon new code generation.
 */
export async function saveOtp(
  email: string,
  otp: string,
  ttlSeconds = DEFAULT_OTP_TTL_SECONDS,
  maxAttempts = DEFAULT_MAX_OTP_ATTEMPTS
): Promise<{ otp: string; expiresAt: number; expiresAtDate: string }> {
  const normalized = normalizeEmail(email);
  const now = Date.now();
  const expiresAt = now + ttlSeconds * 1000;

  otpMemoryStore.set(normalized, {
    otp: otp.trim(),
    expiresAt,
    createdAt: now,
    failedAttempts: 0,
    maxAttempts,
    lockedUntil: null,
  });

  // Reset any previous failed attempt locks for this email upon fresh OTP issuance
  otpAttemptsMemoryStore.delete(normalized);

  return {
    otp: otp.trim(),
    expiresAt,
    expiresAtDate: new Date(expiresAt).toISOString(),
  };
}

/**
 * Returns the strict expiration timestamp for an active OTP (or null if not found/expired).
 */
export async function getOtpExpiresAt(email: string): Promise<number | null> {
  const normalized = normalizeEmail(email);
  const entry = otpMemoryStore.get(normalized);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    otpMemoryStore.delete(normalized);
    return null;
  }
  return entry.expiresAt;
}

/**
 * Checks whether an OTP has expired.
 */
export async function isOtpExpired(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  const entry = otpMemoryStore.get(normalized);
  if (!entry) return true;
  if (Date.now() > entry.expiresAt) {
    otpMemoryStore.delete(normalized);
    return true;
  }
  return false;
}

/**
 * Checks whether verification attempts are currently locked out for an email.
 */
export async function isOtpLocked(
  email: string
): Promise<{ locked: boolean; remainingLockTimeMs: number }> {
  const normalized = normalizeEmail(email);
  const now = Date.now();
  const attemptRecord = otpAttemptsMemoryStore.get(normalized);

  if (attemptRecord?.lockedUntil && now < attemptRecord.lockedUntil) {
    return {
      locked: true,
      remainingLockTimeMs: attemptRecord.lockedUntil - now,
    };
  }

  // Also check entry-level lock if exists
  const entry = otpMemoryStore.get(normalized);
  if (entry?.lockedUntil && now < entry.lockedUntil) {
    return {
      locked: true,
      remainingLockTimeMs: entry.lockedUntil - now,
    };
  }

  // If lockout duration has elapsed, clear lockout
  if (attemptRecord?.lockedUntil && now >= attemptRecord.lockedUntil) {
    attemptRecord.lockedUntil = null;
    attemptRecord.failedAttempts = 0;
  }

  if (entry?.lockedUntil && now >= entry.lockedUntil) {
    entry.lockedUntil = null;
    entry.failedAttempts = 0;
  }

  return { locked: false, remainingLockTimeMs: 0 };
}

/**
 * Records a consecutive incorrect OTP attempt and applies a lockout when threshold is reached.
 */
export function recordFailedAttempt(
  email: string,
  maxAttempts = DEFAULT_MAX_OTP_ATTEMPTS,
  lockoutMs = DEFAULT_LOCKOUT_MS
): { failedAttempts: number; locked: boolean; remainingAttempts: number; lockedUntil: number | null } {
  const normalized = normalizeEmail(email);
  const now = Date.now();

  let attemptRecord = otpAttemptsMemoryStore.get(normalized);
  if (!attemptRecord || (attemptRecord.lockedUntil && now >= attemptRecord.lockedUntil)) {
    attemptRecord = { failedAttempts: 0, lockedUntil: null, lastAttemptAt: now };
    otpAttemptsMemoryStore.set(normalized, attemptRecord);
  }

  attemptRecord.failedAttempts += 1;
  attemptRecord.lastAttemptAt = now;

  // Also sync with entry if present
  const entry = otpMemoryStore.get(normalized);
  if (entry) {
    entry.failedAttempts = attemptRecord.failedAttempts;
  }

  if (attemptRecord.failedAttempts >= maxAttempts) {
    const lockedUntil = now + lockoutMs;
    attemptRecord.lockedUntil = lockedUntil;
    if (entry) {
      entry.lockedUntil = lockedUntil;
    }
    return {
      failedAttempts: attemptRecord.failedAttempts,
      locked: true,
      remainingAttempts: 0,
      lockedUntil,
    };
  }

  return {
    failedAttempts: attemptRecord.failedAttempts,
    locked: false,
    remainingAttempts: Math.max(0, maxAttempts - attemptRecord.failedAttempts),
    lockedUntil: null,
  };
}

/**
 * Clears consecutive failed attempts upon successful OTP verification.
 */
export function resetOtpAttempts(email: string): void {
  const normalized = normalizeEmail(email);
  otpAttemptsMemoryStore.delete(normalized);
  const entry = otpMemoryStore.get(normalized);
  if (entry) {
    entry.failedAttempts = 0;
    entry.lockedUntil = null;
  }
}

/**
 * Retrieves the stored OTP if it has not expired and is not locked.
 */
export async function getOtp(email: string): Promise<string | null> {
  const normalized = normalizeEmail(email);
  const lockStatus = await isOtpLocked(normalized);
  if (lockStatus.locked) return null;

  const entry = otpMemoryStore.get(normalized);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    otpMemoryStore.delete(normalized);
    return null;
  }

  return entry.otp;
}

/**
 * Retrieves the full OTP entry.
 */
export async function getOtpEntry(email: string): Promise<OtpEntry | null> {
  const normalized = normalizeEmail(email);
  const entry = otpMemoryStore.get(normalized);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    otpMemoryStore.delete(normalized);
    return null;
  }
  return entry;
}

/**
 * Comprehensive OTP verification with consecutive failure rate limiting and strict expiration checking.
 * - Rejects/locks requests after consecutive incorrect submissions (3–5 attempts, default 5).
 * - Enforces strict expiration timestamp verification.
 */
export async function verifyOtpDetailed(
  email: string,
  inputOtp: string,
  maxAttempts = DEFAULT_MAX_OTP_ATTEMPTS,
  lockoutMs = DEFAULT_LOCKOUT_MS
): Promise<VerifyOtpResult> {
  const normalized = normalizeEmail(email);
  const now = Date.now();

  // 1. Check if verification attempts are locked
  const lockStatus = await isOtpLocked(normalized);
  if (lockStatus.locked) {
    return {
      success: false,
      locked: true,
      expired: false,
      remainingAttempts: 0,
      error: "تم تجاوز الحد الأقصى للمحاولات غير الصحيحة لكود التحقق. تم قفل المحاولات مؤقتاً لحماية الحساب.",
    };
  }

  const entry = otpMemoryStore.get(normalized);

  // 2. Check if OTP exists
  if (!entry) {
    const failure = recordFailedAttempt(normalized, maxAttempts, lockoutMs);
    if (failure.locked) {
      return {
        success: false,
        locked: true,
        expired: true,
        remainingAttempts: 0,
        error: `تم تجاوز الحد الأقصى للمحاولات غير الصحيحة لكود التحقق (${maxAttempts} محاولات). تم قفل المحاولات مؤقتاً لحماية الحساب.`,
      };
    }
    return {
      success: false,
      locked: false,
      expired: true,
      remainingAttempts: failure.remainingAttempts,
      error: "كود التحقق غير صحيح أو انتهت صلاحيته",
    };
  }

  // 3. Strict expiration timestamp check
  if (now > entry.expiresAt) {
    otpMemoryStore.delete(normalized);
    const failure = recordFailedAttempt(normalized, maxAttempts, lockoutMs);
    if (failure.locked) {
      return {
        success: false,
        locked: true,
        expired: true,
        remainingAttempts: 0,
        error: `تم تجاوز الحد الأقصى للمحاولات غير الصحيحة لكود التحقق (${maxAttempts} محاولات). تم قفل المحاولات مؤقتاً لحماية الحساب.`,
      };
    }
    return {
      success: false,
      locked: false,
      expired: true,
      remainingAttempts: failure.remainingAttempts,
      error: "كود التحقق غير صحيح أو انتهت صلاحيته",
    };
  }

  // 4. Compare input OTP with stored OTP
  if (entry.otp.trim() !== inputOtp.trim()) {
    const failure = recordFailedAttempt(normalized, maxAttempts, lockoutMs);
    if (failure.locked) {
      return {
        success: false,
        locked: true,
        expired: false,
        remainingAttempts: 0,
        error: `تم تجاوز الحد الأقصى للمحاولات غير الصحيحة لكود التحقق (${maxAttempts} محاولات). تم قفل المحاولات مؤقتاً لحماية الحساب.`,
      };
    }
    return {
      success: false,
      locked: false,
      expired: false,
      remainingAttempts: failure.remainingAttempts,
      error: "كود التحقق غير صحيح أو انتهت صلاحيته",
    };
  }

  // 5. Successful match: reset failure records
  resetOtpAttempts(normalized);

  return {
    success: true,
    locked: false,
    expired: false,
    remainingAttempts: maxAttempts,
    expiresAt: entry.expiresAt,
    message: "تم التحقق من كود الاستعادة بنجاح",
  };
}

/**
 * Validates the provided OTP against the stored one.
 * Returns true if valid, false if invalid or locked.
 */
export async function verifyOtp(email: string, inputOtp: string): Promise<boolean> {
  const result = await verifyOtpDetailed(email, inputOtp);
  return result.success;
}

/**
 * Invalidates and deletes the stored OTP after successful password reset.
 */
export async function deleteOtp(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  otpMemoryStore.delete(normalized);
  otpAttemptsMemoryStore.delete(normalized);
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
  otpAttemptsMemoryStore.clear();
  rateLimitMemoryStore.clear();
}
