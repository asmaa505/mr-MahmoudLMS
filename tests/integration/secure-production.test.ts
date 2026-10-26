import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  generateStrongPassword,
  validatePasswordStrength,
  isPasswordMatchingDefaults,
  isSeedUser,
  purgeSeedData,
  replaceAdminDefaultCredentials,
  verifyProductionReadiness,
  KNOWN_DEFAULT_PASSWORDS,
  PRODUCTION_PASSWORD_POLICY,
} from "@/lib/production-security";
import { db } from "@/lib/db";
import { comparePassword, hashPassword, signToken } from "@/lib/auth";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { NextRequest } from "next/server";

// Mock next/headers for login route tests
vi.mock("next/headers", () => {
  const cookieStore = {
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  };
  return {
    cookies: () => Promise.resolve(cookieStore),
    headers: () => Promise.resolve(new Headers({ "x-forwarded-for": "127.0.0.1" })),
  };
});

describe("Production Security & Credentials Hardening", () => {
  const testAdminPhone = "01000000000";
  const testMockStudentPhone = "01111111111";
  const testBotPhone = "01000000001";
  const testLegitStudentPhone = "01065432109";

  let legitStudentId = "";

  beforeAll(async () => {
    // Ensure clean state for test accounts
    await db.user.deleteMany({
      where: { phone: testLegitStudentPhone },
    });

    // Create a legitimate student that should NOT be purged
    const legit = await db.user.create({
      data: {
        name: "طالب حقيقي مسجل",
        phone: testLegitStudentPhone,
        password: await hashPassword(generateStrongPassword(24)),
        role: "STUDENT",
        isApproved: true,
        grade: "3",
      },
    });
    legitStudentId = legit.id;
  });

  afterAll(async () => {
    if (legitStudentId) {
      await db.session.deleteMany({ where: { userId: legitStudentId } });
      await db.user.deleteMany({ where: { id: legitStudentId } });
    }
  });

  describe("Unit: Strong Password Generator & Validator", () => {
    it("should generate cryptographically strong passwords conforming to production policy", () => {
      for (let i = 0; i < 20; i++) {
        const password = generateStrongPassword(24);
        expect(password.length).toBe(24);
        expect(/[A-Z]/.test(password)).toBe(true);
        expect(/[a-z]/.test(password)).toBe(true);
        expect(/[0-9]/.test(password)).toBe(true);
        expect(/[^A-Za-z0-9]/.test(password)).toBe(true);

        const check = validatePasswordStrength(password);
        expect(check.isStrong).toBe(true);
        expect(check.score).toBeGreaterThanOrEqual(90);
        expect(check.reasons.length).toBe(0);
      }
    });

    it("should reject known weak or default credentials", () => {
      for (const def of KNOWN_DEFAULT_PASSWORDS) {
        const check = validatePasswordStrength(def);
        expect(check.isStrong).toBe(false);
        expect(check.reasons.length).toBeGreaterThan(0);
      }
    });

    it("should reject passwords that fail policy constraints (length, character variety)", () => {
      expect(validatePasswordStrength("Short1!").isStrong).toBe(false);
      expect(validatePasswordStrength("NoSpecialCharacters123456").isStrong).toBe(false);
      expect(validatePasswordStrength("nouppercase1234567890!@#").isStrong).toBe(false);
      expect(validatePasswordStrength("NOLOWERCASE1234567890!@#").isStrong).toBe(false);
      expect(validatePasswordStrength("NoNumbersInThisVeryLongPassword!@#$").isStrong).toBe(false);
    });
  });

  describe("Unit: Default Password Matching", () => {
    it("should detect bcrypt hashes of default passwords", async () => {
      const defaultHash = await hashPassword("admin123");
      const check = await isPasswordMatchingDefaults(defaultHash);
      expect(check.matches).toBe(true);
      expect(check.matchedPassword).toBe("admin123");

      const studentHash = await hashPassword("student123");
      const studentCheck = await isPasswordMatchingDefaults(studentHash);
      expect(studentCheck.matches).toBe(true);
      expect(studentCheck.matchedPassword).toBe("student123");
    });

    it("should return false for strong randomized password hashes", async () => {
      const strongPass = generateStrongPassword(24);
      const strongHash = await hashPassword(strongPass);
      const check = await isPasswordMatchingDefaults(strongHash);
      expect(check.matches).toBe(false);
    });
  });

  describe("Integration: Seed Data Identification & Purging", () => {
    it("should accurately identify seed accounts vs legitimate accounts", async () => {
      const seed1 = await isSeedUser({
        id: "1",
        name: "عمر خالد (طالب 3 ثانوي)",
        phone: testMockStudentPhone,
        role: "STUDENT",
      });
      expect(seed1.isSeed).toBe(true);

      const bot = await isSeedUser({
        id: "2",
        name: "بوت 1",
        phone: testBotPhone,
        role: "STUDENT",
      });
      expect(bot.isSeed).toBe(true);

      const legit = await isSeedUser({
        id: "3",
        name: "محمد إبراهيم",
        phone: testLegitStudentPhone,
        role: "STUDENT",
      });
      expect(legit.isSeed).toBe(false);

      // Primary admin must never be flagged for deletion
      const admin = await isSeedUser({
        id: "4",
        name: "الأستاذ محمود الشحات",
        phone: testAdminPhone,
        role: "ADMIN",
      });
      expect(admin.isSeed).toBe(false);
    });

    it("should purge development seed data while preserving legitimate users", async () => {
      // 1. Ensure seed data exists for testing purge
      await db.user.upsert({
        where: { phone: testMockStudentPhone },
        update: {},
        create: {
          name: "عمر خالد (طالب 3 ثانوي)",
          phone: testMockStudentPhone,
          password: await hashPassword("student123"),
          role: "STUDENT",
          isApproved: true,
          grade: "3",
        },
      });

      await db.activationCode.upsert({
        where: { code: "PHYSICS-2026-CODE1" },
        update: {},
        create: {
          code: "PHYSICS-2026-CODE1",
          isUsed: false,
        },
      });

      // 2. Perform purge
      const result = await purgeSeedData({ dryRun: false });
      expect(result.purgedUsers.length).toBeGreaterThan(0);
      expect(result.purgedActivationCodes).toContain("PHYSICS-2026-CODE1");

      // 3. Verify seed user was purged from database
      const purgedUser = await db.user.findUnique({
        where: { phone: testMockStudentPhone },
      });
      expect(purgedUser).toBeNull();

      // 4. Verify seed activation code was purged from database
      const purgedCode = await db.activationCode.findUnique({
        where: { code: "PHYSICS-2026-CODE1" },
      });
      expect(purgedCode).toBeNull();

      // 5. Verify legitimate student was NOT purged
      const legitUser = await db.user.findUnique({
        where: { phone: testLegitStudentPhone },
      });
      expect(legitUser).not.toBeNull();
    }, 15000);
  });

  describe("Integration: Administrative Default Credential Replacement", () => {
    let originalAdminPasswordHash = "";
    let generatedAdminPassword = "";

    it("should replace administrative default password with strong random credentials and invalidate sessions", async () => {
      // 1. Ensure admin user exists and reset to default password for test
      const admin = await db.user.upsert({
        where: { phone: testAdminPhone },
        update: { password: await hashPassword("admin123") },
        create: {
          name: "الأستاذ محمود الشحات",
          phone: testAdminPhone,
          password: await hashPassword("admin123"),
          role: "ADMIN",
          isApproved: true,
          grade: "3",
        },
      });

      // Create an active session to test session invalidation
      const staleToken = signToken({
        userId: admin.id,
        role: "ADMIN",
        name: admin.name,
        phone: admin.phone,
        sessionId: crypto.randomUUID(),
      });
      await db.session.create({
        data: {
          token: staleToken,
          userId: admin.id,
        },
      });

      // Verify active session exists
      const preSessionCount = await db.session.count({ where: { userId: admin.id } });
      expect(preSessionCount).toBeGreaterThanOrEqual(1);

      // 2. Execute credential rotation
      const rotationResults = await replaceAdminDefaultCredentials({
        adminPhone: testAdminPhone,
        forceRotate: true,
      });

      expect(rotationResults.length).toBe(1);
      const res = rotationResults[0];
      expect(res.phone).toBe(testAdminPhone);
      expect(res.previousWasDefault).toBe(true);
      expect(res.newPasswordPlaintext).toBeDefined();
      expect(res.newPasswordPlaintext.length).toBeGreaterThanOrEqual(20);
      expect(res.sessionsRevokedCount).toBeGreaterThanOrEqual(1);
      generatedAdminPassword = res.newPasswordPlaintext;

      // 3. Verify database password was updated and old password fails
      const updatedAdmin = await db.user.findUnique({
        where: { phone: testAdminPhone },
      });
      expect(updatedAdmin).not.toBeNull();

      const oldPasswordMatches = await comparePassword("admin123", updatedAdmin!.password);
      expect(oldPasswordMatches).toBe(false);

      const mahmoud123Matches = await comparePassword("mahmoud123", updatedAdmin!.password);
      expect(mahmoud123Matches).toBe(false);

      const newPasswordMatches = await comparePassword(generatedAdminPassword, updatedAdmin!.password);
      expect(newPasswordMatches).toBe(true);

      // 4. Verify all active sessions were revoked
      const postSessionCount = await db.session.count({ where: { userId: admin.id } });
      expect(postSessionCount).toBe(0);
    }, 15000);

    it("should reject login attempt using old default administrative password (401)", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          phone: testAdminPhone,
          password: "admin123",
        }),
      });

      const response = await loginHandler(req);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe("بيانات الدخول غير صحيحة");
    });

    it("should allow login attempt using the newly generated strong password (200)", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          phone: testAdminPhone,
          password: generatedAdminPassword,
        }),
      });

      const response = await loginHandler(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.user).toBeDefined();
      expect(json.user.phone).toBe(testAdminPhone);
      expect(json.user.role).toBe("ADMIN");
    });
  });

  describe("Integration: Production Readiness Verification", () => {
    it("should confirm the database is production ready when seed data is purged and credentials are secure", async () => {
      const readiness = await verifyProductionReadiness();

      expect(readiness.isReady).toBe(true);
      expect(readiness.violations.length).toBe(0);
      expect(readiness.details.admins.length).toBeGreaterThanOrEqual(1);
      expect(readiness.details.admins.every((a) => !a.hasDefaultPassword)).toBe(true);
      expect(readiness.details.seedUsersCount).toBe(0);
      expect(readiness.details.seedCodesCount).toBe(0);
    }, 15000);
  });
});
