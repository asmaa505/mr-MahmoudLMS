import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";

/**
 * Known default and insecure passwords used during development and testing.
 */
export const KNOWN_DEFAULT_PASSWORDS = [
  "admin123",
  "mahmoud123",
  "student123",
  "password123",
  "123456",
];

/**
 * Known development and seed phone numbers that must be purged before production.
 */
export const KNOWN_SEED_PHONES = [
  "01111111111", // Seed student (أحمد طالب تجريبي / عمر خالد)
  "01222222222", // Seed student (سارة محمد)
  "01555555555", // Seed student (يوسف علي)
  "01099998877", // Seed pending student (زياد حسام)
  "01012345678", // Demo admin created in create-demo-accounts.ts
  "01000000001", // Bot 1
  "01000000002", // Bot 2
  "01000000003", // Bot 3
  "01000000004", // Bot 4
  "01000000005", // Bot 5
  "01000000006", // Bot 6
  "01000000007", // Bot 7
  "01000000008", // Bot 8
  "01000000009", // Bot 9
  "010 09791223", // Dummy test account
  "01024962933",  // Dummy test account 2
  "0 10 24962933", // Dummy test account 2 spaced
  "010309813412", // Placeholder test user "ld"
  "010309813413", // Placeholder test user "bbbb"
];

/**
 * Known seed and demo activation codes.
 */
export const KNOWN_SEED_ACTIVATION_CODES = [
  "PHYSICS-2026-CODE1",
  "PHYSICS-2026-CODE2",
  "PHYSICS-2026-CODE3",
  "PHY-ELEC-333",
  "PHY-MECH-111",
  "PHY-LECT-999",
];

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
}

export const PRODUCTION_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 20,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true,
};

/**
 * Generates a cryptographically secure, high-entropy random password.
 * Guaranteed to fulfill the production password policy.
 */
export function generateStrongPassword(
  length = 24,
  policy = PRODUCTION_PASSWORD_POLICY
): string {
  if (length < policy.minLength) {
    length = policy.minLength;
  }

  const uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // exclude easily confusable I, O
  const lowers = "abcdefghijkmnopqrstuvwxyz"; // exclude l
  const numbers = "23456789"; // exclude 0, 1
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  const allChars = uppers + lowers + numbers + symbols;

  // Guarantee policy satisfaction by explicitly selecting characters from each set
  const requiredChars: string[] = [];
  if (policy.requireUppercase) {
    requiredChars.push(uppers[crypto.randomInt(0, uppers.length)]);
    requiredChars.push(uppers[crypto.randomInt(0, uppers.length)]);
  }
  if (policy.requireLowercase) {
    requiredChars.push(lowers[crypto.randomInt(0, lowers.length)]);
    requiredChars.push(lowers[crypto.randomInt(0, lowers.length)]);
  }
  if (policy.requireNumbers) {
    requiredChars.push(numbers[crypto.randomInt(0, numbers.length)]);
    requiredChars.push(numbers[crypto.randomInt(0, numbers.length)]);
  }
  if (policy.requireSymbols) {
    requiredChars.push(symbols[crypto.randomInt(0, symbols.length)]);
    requiredChars.push(symbols[crypto.randomInt(0, symbols.length)]);
  }

  const remainingLength = length - requiredChars.length;
  const chars = [...requiredChars];
  for (let i = 0; i < remainingLength; i++) {
    chars.push(allChars[crypto.randomInt(0, allChars.length)]);
  }

  // Fisher-Yates cryptographically secure shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const temp = chars[i];
    chars[i] = chars[j];
    chars[j] = temp;
  }

  return chars.join("");
}

/**
 * Validates password strength against security policy and known default credentials.
 */
export function validatePasswordStrength(
  password: string,
  policy = PRODUCTION_PASSWORD_POLICY
): {
  isStrong: boolean;
  score: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 0;

  if (!password || password.length < policy.minLength) {
    reasons.push(`يجب ألا تقل كلمة المرور عن ${policy.minLength} حرفاً (Password must be at least ${policy.minLength} characters)`);
  } else {
    score += 30;
    if (password.length >= 20) score += 10;
    if (password.length >= 24) score += 10;
  }

  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    reasons.push("يجب أن تحتوي كلمة المرور على أحرف كبيرة (Must contain uppercase letters)");
  } else if (/[A-Z]/.test(password)) {
    score += 15;
  }

  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    reasons.push("يجب أن تحتوي كلمة المرور على أحرف صغيرة (Must contain lowercase letters)");
  } else if (/[a-z]/.test(password)) {
    score += 15;
  }

  if (policy.requireNumbers && !/[0-9]/.test(password)) {
    reasons.push("يجب أن تحتوي كلمة المرور على أرقام (Must contain numbers)");
  } else if (/[0-9]/.test(password)) {
    score += 15;
  }

  if (policy.requireSymbols && !/[^A-Za-z0-9]/.test(password)) {
    reasons.push("يجب أن تحتوي كلمة المرور على رموز خاصة (Must contain special symbols)");
  } else if (/[^A-Za-z0-9]/.test(password)) {
    score += 15;
  }

  const lower = (password || "").toLowerCase();
  for (const known of KNOWN_DEFAULT_PASSWORDS) {
    if (lower === known.toLowerCase() || lower.includes(known.toLowerCase())) {
      reasons.push(`كلمة المرور تحتوي على نمط افتراضي معروف وضعيف: "${known}"`);
      score = Math.min(score, 20);
      break;
    }
  }

  return {
    isStrong: reasons.length === 0,
    score: Math.min(100, Math.max(0, score)),
    reasons,
  };
}

/**
 * Checks whether a password hash matches any known default development password.
 */
export async function isPasswordMatchingDefaults(hash: string): Promise<{
  matches: boolean;
  matchedPassword?: string;
}> {
  if (!hash || typeof hash !== "string" || !hash.startsWith("$2")) {
    return { matches: false };
  }

  // Evaluate candidate default passwords concurrently using threadpool
  const checks = await Promise.all(
    KNOWN_DEFAULT_PASSWORDS.map(async (def) => {
      try {
        const match = await bcrypt.compare(def, hash);
        return match ? def : null;
      } catch {
        return null;
      }
    })
  );

  const matched = checks.find((m): m is string => Boolean(m));
  if (matched) {
    return { matches: true, matchedPassword: matched };
  }
  return { matches: false };
}

/**
 * Checks if a user record matches seed or test account signatures.
 */
export async function isSeedUser(user: {
  id: string;
  name: string;
  phone: string;
  role: string;
  password?: string;
}): Promise<{ isSeed: boolean; reason?: string }> {
  // Never treat the primary admin as a seed user to be deleted (admin credentials should be replaced, not deleted)
  if (user.role === "ADMIN" && user.phone === "01000000000") {
    return { isSeed: false };
  }

  // 1. Direct match with known seed phones
  if (KNOWN_SEED_PHONES.includes(user.phone) || KNOWN_SEED_PHONES.includes(user.phone.trim())) {
    return { isSeed: true, reason: `Known seed phone number: ${user.phone}` };
  }

  // 2. Pattern match for bot phone numbers (01000000001 - 01000000099)
  if (/^010000000\d{2}$/.test(user.phone) || /^0100000000\d$/.test(user.phone)) {
    return { isSeed: true, reason: `Matches mock bot phone pattern: ${user.phone}` };
  }

  // 3. Name indicators of test/demo accounts
  const trimmedName = user.name.trim();
  if (
    trimmedName.includes("تجريبي") ||
    trimmedName.includes("تجريببي") ||
    trimmedName.includes("قيد الانتظار") ||
    trimmedName.startsWith("بوت ") ||
    trimmedName.toLowerCase().includes("test") ||
    trimmedName.toLowerCase().includes("demo") ||
    trimmedName === "ld" ||
    trimmedName === "bbbb"
  ) {
    return { isSeed: true, reason: `Name pattern indicates test/demo account: "${user.name}"` };
  }

  // 4. Student accounts using known default passwords
  if (user.role === "STUDENT" && user.password) {
    const defaultCheck = await isPasswordMatchingDefaults(user.password);
    if (defaultCheck.matches) {
      return { isSeed: true, reason: `Student account using default password "${defaultCheck.matchedPassword}"` };
    }
  }

  return { isSeed: false };
}

export interface PurgeResult {
  purgedUsers: { id: string; name: string; phone: string; role: string; reason: string }[];
  purgedActivationCodes: string[];
  deletedSessionsCount: number;
  deletedQuizAttemptsCount: number;
  deletedLessonProgressCount: number;
  deletedEnrollmentsCount: number;
  deletedWeeklyReportsCount: number;
  dryRun: boolean;
}

/**
 * Purges all development seed data, demo accounts, and dummy test activation codes from the database.
 */
export async function purgeSeedData(options?: {
  dryRun?: boolean;
}): Promise<PurgeResult> {
  const dryRun = options?.dryRun ?? false;

  const allUsers = await db.user.findMany({
    select: { id: true, name: true, phone: true, role: true, password: true },
  });

  const usersToPurge: { id: string; name: string; phone: string; role: string; reason: string }[] = [];
  for (const user of allUsers) {
    const check = await isSeedUser(user);
    if (check.isSeed) {
      usersToPurge.push({
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        reason: check.reason || "Seed account",
      });
    }
  }

  // Identify seed activation codes
  const seedCodes = await db.activationCode.findMany({
    where: {
      OR: [
        { code: { in: KNOWN_SEED_ACTIVATION_CODES } },
        { code: { startsWith: "PHYSICS-2026-CODE" } },
        { code: { startsWith: "TEST-CODE-" } },
        { code: { startsWith: "DEMO-" } },
      ],
    },
    select: { id: true, code: true },
  });

  const purgedCodesList = seedCodes.map((c) => c.code);

  let deletedSessionsCount = 0;
  let deletedQuizAttemptsCount = 0;
  let deletedLessonProgressCount = 0;
  let deletedEnrollmentsCount = 0;
  let deletedWeeklyReportsCount = 0;

  if (!dryRun) {
    const userIds = usersToPurge.map((u) => u.id);

    if (userIds.length > 0) {
      // 1. Delete associated sessions
      const sessions = await db.session.deleteMany({
        where: { userId: { in: userIds } },
      });
      deletedSessionsCount = sessions.count;

      // 2. Delete quiz attempts
      const attempts = await db.quizAttempt.deleteMany({
        where: { userId: { in: userIds } },
      });
      deletedQuizAttemptsCount = attempts.count;

      // 3. Delete lesson progress
      const progress = await db.lessonProgress.deleteMany({
        where: { userId: { in: userIds } },
      });
      deletedLessonProgressCount = progress.count;

      // 4. Delete enrollments
      const enrollments = await db.enrollment.deleteMany({
        where: { userId: { in: userIds } },
      });
      deletedEnrollmentsCount = enrollments.count;

      // 5. Delete weekly reports
      const reports = await db.weeklyReport.deleteMany({
        where: { userId: { in: userIds } },
      });
      deletedWeeklyReportsCount = reports.count;

      // 6. Reset or dissociate any activation codes used or assigned to purged users
      await db.activationCode.updateMany({
        where: { assignedToId: { in: userIds } },
        data: { assignedToId: null, assignedAt: null },
      });
      await db.activationCode.updateMany({
        where: { usedById: { in: userIds } },
        data: { usedById: null, isUsed: false, usedAt: null },
      });

      // 7. Delete the users
      await db.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }

    // 8. Delete demo activation codes
    if (seedCodes.length > 0) {
      await db.activationCode.deleteMany({
        where: { id: { in: seedCodes.map((c) => c.id) } },
      });
    }
  }

  return {
    purgedUsers: usersToPurge,
    purgedActivationCodes: purgedCodesList,
    deletedSessionsCount,
    deletedQuizAttemptsCount,
    deletedLessonProgressCount,
    deletedEnrollmentsCount,
    deletedWeeklyReportsCount,
    dryRun,
  };
}

export interface AdminCredentialReplacementResult {
  userId: string;
  name: string;
  phone: string;
  previousWasDefault: boolean;
  matchedDefaultPassword?: string;
  newPasswordGenerated: boolean;
  newPasswordPlaintext: string;
  sessionsRevokedCount: number;
}

/**
 * Replaces administrative default/test credentials with strong, randomly generated passwords.
 * Also invalidates active sessions so that stale sessions cannot bypass the new credentials.
 */
export async function replaceAdminDefaultCredentials(options?: {
  adminPhone?: string;
  newPassword?: string;
  forceRotate?: boolean;
  length?: number;
}): Promise<AdminCredentialReplacementResult[]> {
  const forceRotate = options?.forceRotate ?? true; // By default, ensure all admins are securely rotated
  const targetPhone = options?.adminPhone;

  const adminQuery: any = { role: "ADMIN" };
  if (targetPhone) {
    adminQuery.phone = targetPhone;
  }

  const admins = await db.user.findMany({
    where: adminQuery,
    select: { id: true, name: true, phone: true, password: true },
  });

  if (admins.length === 0) {
    throw new Error(
      targetPhone
        ? `No admin user found with phone number ${targetPhone}`
        : "No administrative accounts found in the database!"
    );
  }

  const results: AdminCredentialReplacementResult[] = [];

  for (const admin of admins) {
    const defaultCheck = await isPasswordMatchingDefaults(admin.password);

    if (forceRotate || defaultCheck.matches) {
      let finalPlaintextPassword = options?.newPassword;

      if (finalPlaintextPassword) {
        const strength = validatePasswordStrength(finalPlaintextPassword);
        if (!strength.isStrong) {
          throw new Error(
            `Provided password does not meet security criteria: ${strength.reasons.join(", ")}`
          );
        }
      } else {
        finalPlaintextPassword = generateStrongPassword(options?.length || 24);
      }

      const hashedPassword = await bcrypt.hash(finalPlaintextPassword, 10);

      // Invalidate all active sessions for this admin account
      const revokedSessions = await db.session.deleteMany({
        where: { userId: admin.id },
      });

      // Update admin password in database
      await db.user.update({
        where: { id: admin.id },
        data: { password: hashedPassword },
      });

      results.push({
        userId: admin.id,
        name: admin.name,
        phone: admin.phone,
        previousWasDefault: defaultCheck.matches,
        matchedDefaultPassword: defaultCheck.matchedPassword,
        newPasswordGenerated: !options?.newPassword,
        newPasswordPlaintext: finalPlaintextPassword,
        sessionsRevokedCount: revokedSessions.count,
      });
    }
  }

  return results;
}

/**
 * Verifies production readiness regarding seed data and credentials.
 */
export async function verifyProductionReadiness(): Promise<{
  isReady: boolean;
  violations: string[];
  warnings: string[];
  details: {
    admins: { phone: string; name: string; hasDefaultPassword: boolean; activeSessions: number }[];
    seedUsersCount: number;
    seedCodesCount: number;
  };
}> {
  const violations: string[] = [];
  const warnings: string[] = [];

  // 1. Check Admins
  const admins = await db.user.findMany({
    where: { role: "ADMIN" },
    include: { sessions: true },
  });

  if (admins.length === 0) {
    violations.push("CRITICAL: No administrative account exists in the database.");
  }

  const adminDetails: { phone: string; name: string; hasDefaultPassword: boolean; activeSessions: number }[] = [];

  for (const admin of admins) {
    const check = await isPasswordMatchingDefaults(admin.password);
    adminDetails.push({
      phone: admin.phone,
      name: admin.name,
      hasDefaultPassword: check.matches,
      activeSessions: admin.sessions.length,
    });

    if (check.matches) {
      violations.push(
        `CRITICAL: Administrator "${admin.name}" (${admin.phone}) is still using default password "${check.matchedPassword}".`
      );
    }

    if (admin.sessions.length > 0) {
      warnings.push(
        `WARNING: Administrator "${admin.name}" (${admin.phone}) has ${admin.sessions.length} active sessions before deployment.`
      );
    }
  }

  // 2. Check Seed Users
  const allUsers = await db.user.findMany({
    select: { id: true, name: true, phone: true, role: true, password: true },
  });

  let seedUsersCount = 0;
  for (const user of allUsers) {
    const check = await isSeedUser(user);
    if (check.isSeed) {
      seedUsersCount++;
      violations.push(
        `CRITICAL: Development seed account "${user.name}" (${user.phone}) still exists in database: ${check.reason}`
      );
    }
  }

  // 3. Check Seed Activation Codes
  const seedCodes = await db.activationCode.findMany({
    where: {
      OR: [
        { code: { in: KNOWN_SEED_ACTIVATION_CODES } },
        { code: { startsWith: "PHYSICS-2026-CODE" } },
        { code: { startsWith: "TEST-CODE-" } },
        { code: { startsWith: "DEMO-" } },
      ],
    },
    select: { code: true },
  });

  if (seedCodes.length > 0) {
    violations.push(
      `CRITICAL: ${seedCodes.length} development seed activation code(s) found: ${seedCodes.map((c) => c.code).join(", ")}`
    );
  }

  return {
    isReady: violations.length === 0,
    violations,
    warnings,
    details: {
      admins: adminDetails,
      seedUsersCount,
      seedCodesCount: seedCodes.length,
    },
  };
}
