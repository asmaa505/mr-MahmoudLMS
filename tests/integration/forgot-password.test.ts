import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { POST as forgotPasswordHandler } from "@/app/api/auth/forgot-password/route";
import { POST as verifyOtpHandler } from "@/app/api/auth/verify-otp/route";
import { POST as resetPasswordHandler } from "@/app/api/auth/reset-password/route";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { resetOtpStore, saveOtp, isOtpExpired, isOtpLocked, verifyOtpDetailed } from "@/lib/otp";
import { getLastSentEmail, clearSentEmails } from "@/lib/email";

vi.mock("next/headers", () => {
  const cookieStore = {
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  };
  return {
    cookies: () => Promise.resolve(cookieStore),
  };
});

describe("Password Reset & OTP Flow (Forgot Password Feature)", () => {
  const testPhone = "01012345678";
  const testEmail = "student.physics@example.com";
  const unRegisteredEmail = "notfound@example.com";
  const initialPassword = "initialPassword123!";
  const newPassword = "newSecurePassword2026@";
  let testUserId: string;

  beforeAll(async () => {
    // Cleanup any pre-existing records with test email/phone
    await db.user.deleteMany({
      where: {
        OR: [{ phone: testPhone }, { email: testEmail }],
      },
    });

    // Seed test user with initial password and email
    const hashedPassword = await hashPassword(initialPassword);
    const user = await db.user.create({
      data: {
        name: "طالب تجريبي للاختبار",
        phone: testPhone,
        email: testEmail,
        password: hashedPassword,
        role: "STUDENT",
        isApproved: true,
        isBlocked: false,
        grade: "3",
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // Cleanup test user and sessions
    if (testUserId) {
      await db.session.deleteMany({ where: { userId: testUserId } });
      await db.user.deleteMany({ where: { id: testUserId } });
    }
  });

  beforeEach(() => {
    resetOtpStore();
    clearSentEmails();
  });

  // ---------------------------------------------------------------------------
  // AC2: Un-registered email displays user-friendly error message
  // ---------------------------------------------------------------------------
  it("AC2: should return user-friendly error 'البريد الإلكتروني غير مسجل بالمنصة' for unregistered email", async () => {
    const req = new NextRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: unRegisteredEmail }),
    });

    const res = await forgotPasswordHandler(req);
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error).toBe("البريد الإلكتروني غير مسجل بالمنصة");
  });

  it("should validate invalid email syntax", async () => {
    const req = new NextRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: "invalid-email-format" }),
    });

    const res = await forgotPasswordHandler(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain("صيغة البريد الإلكتروني غير صحيحة");
  });

  // ---------------------------------------------------------------------------
  // AC3: Successfully requesting password reset sends HTML email with OTP
  // ---------------------------------------------------------------------------
  it("AC3: should generate a 6-digit OTP and send an HTML email containing OTP & direct reset link", async () => {
    const startTime = Date.now();
    const req = new NextRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: testEmail }),
    });

    const res = await forgotPasswordHandler(req);
    const duration = Date.now() - startTime;

    expect(res.status).toBe(200);
    // Verification within 10 seconds requirement
    expect(duration).toBeLessThan(10000);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain("تم إرسال كود التحقق");

    // Inspect sent email
    const sentEmail = getLastSentEmail();
    expect(sentEmail).toBeDefined();
    expect(sentEmail?.to).toBe(testEmail);
    expect(sentEmail?.otp).toMatch(/^\d{6}$/); // 6-digit numeric OTP
    expect(sentEmail?.html).toContain(sentEmail!.otp);
    expect(sentEmail?.resetLink).toContain(`/reset-password?email=${encodeURIComponent(testEmail)}&otp=${sentEmail!.otp}`);
    expect(sentEmail?.html).toContain("منصة الأستاذ محمود الشحات");
  });

  // ---------------------------------------------------------------------------
  // AC4: Entering an expired or incorrect OTP shows error
  // ---------------------------------------------------------------------------
  it("AC4: should reject incorrect OTP with 'كود التحقق غير صحيح أو انتهت صلاحيته'", async () => {
    // Generate valid OTP first
    const forgotReq = new NextRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: testEmail }),
    });
    await forgotPasswordHandler(forgotReq);

    // Verify with invalid OTP
    const verifyReq = new NextRequest("http://localhost/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email: testEmail, otp: "000000" }),
    });

    const verifyRes = await verifyOtpHandler(verifyReq);
    expect(verifyRes.status).toBe(400);

    const body = await verifyRes.json();
    expect(body.error).toBe("كود التحقق غير صحيح أو انتهت صلاحيته");
  });

  it("AC4: should accept correct OTP", async () => {
    const forgotReq = new NextRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: testEmail }),
    });
    await forgotPasswordHandler(forgotReq);

    const sentEmail = getLastSentEmail();
    expect(sentEmail).toBeDefined();

    const verifyReq = new NextRequest("http://localhost/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email: testEmail, otp: sentEmail!.otp }),
    });

    const verifyRes = await verifyOtpHandler(verifyReq);
    expect(verifyRes.status).toBe(200);

    const body = await verifyRes.json();
    expect(body.success).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // AC5: New password criteria validation (>= 8 chars, 1 number, 1 special char, matching)
  // ---------------------------------------------------------------------------
  it("AC5: should reject password if shorter than 8 characters", async () => {
    await saveOtp(testEmail, "123456");

    const req = new NextRequest("http://localhost/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        email: testEmail,
        otp: "123456",
        newPassword: "short1!",
        confirmPassword: "short1!",
      }),
    });

    const res = await resetPasswordHandler(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain("8 أحرف على الأقل");
  });

  it("AC5: should reject password missing a numeric character", async () => {
    await saveOtp(testEmail, "123456");

    const req = new NextRequest("http://localhost/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        email: testEmail,
        otp: "123456",
        newPassword: "passwordNoNumber!",
        confirmPassword: "passwordNoNumber!",
      }),
    });

    const res = await resetPasswordHandler(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain("رقم واحد على الأقل");
  });

  it("AC5: should reject password missing a special character", async () => {
    await saveOtp(testEmail, "123456");

    const req = new NextRequest("http://localhost/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        email: testEmail,
        otp: "123456",
        newPassword: "passwordWith123",
        confirmPassword: "passwordWith123",
      }),
    });

    const res = await resetPasswordHandler(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain("رمز خاص واحد على الأقل");
  });

  it("AC5: should reject non-matching password confirmation", async () => {
    await saveOtp(testEmail, "123456");

    const req = new NextRequest("http://localhost/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        email: testEmail,
        otp: "123456",
        newPassword: "ValidPassword123!",
        confirmPassword: "DifferentPassword123!",
      }),
    });

    const res = await resetPasswordHandler(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain("غير متطابقتين");
  });

  // ---------------------------------------------------------------------------
  // AC6: Successful reset: old password fails, new password succeeds, sessions revoked
  // ---------------------------------------------------------------------------
  it("AC6: should reset password successfully, block old password login, and allow new password login", async () => {
    // 1. Create a dummy session for the user
    await db.session.create({
      data: {
        userId: testUserId,
        token: "old-session-token-to-be-revoked-" + Date.now(),
        ipAddress: "127.0.0.1",
        userAgent: "Old Device",
      },
    });

    const initialSessionsCount = await db.session.count({ where: { userId: testUserId } });
    expect(initialSessionsCount).toBeGreaterThan(0);

    // 2. Request OTP
    const forgotReq = new NextRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: testEmail }),
    });
    await forgotPasswordHandler(forgotReq);
    const sentEmail = getLastSentEmail();
    expect(sentEmail).toBeDefined();

    // 3. Reset Password
    const resetReq = new NextRequest("http://localhost/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        email: testEmail,
        otp: sentEmail!.otp,
        newPassword,
        confirmPassword: newPassword,
      }),
    });

    const resetRes = await resetPasswordHandler(resetReq);
    expect(resetRes.status).toBe(200);

    const resetBody = await resetRes.json();
    expect(resetBody.success).toBe(true);
    expect(resetBody.message).toContain("تم تغيير كلمة السر بنجاح، يمكنك التسجيل الآن");

    // 4. Verify previous sessions are revoked
    const sessionsAfterReset = await db.session.count({ where: { userId: testUserId } });
    expect(sessionsAfterReset).toBe(0);

    // 5. Verify old password no longer works
    const oldLoginReq = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        phone: testPhone,
        password: initialPassword,
      }),
    });
    const oldLoginRes = await loginHandler(oldLoginReq);
    expect(oldLoginRes.status).toBe(401);

    // 6. Verify new password works properly
    const newLoginReq = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        phone: testPhone,
        password: newPassword,
      }),
    });
    const newLoginRes = await loginHandler(newLoginReq);
    expect(newLoginRes.status).toBe(200);

    const loginBody = await newLoginRes.json();
    expect(loginBody.message).toContain("تم تسجيل الدخول بنجاح");
    expect(loginBody.user.id).toBe(testUserId);
  });

  // ---------------------------------------------------------------------------
  // AC7: Strict rate-limiting on /api/auth/forgot-password (max 3 requests)
  // ---------------------------------------------------------------------------
  it("AC7: should enforce strict rate-limiting on /api/auth/forgot-password (max 3 per hour)", async () => {
    const ip = "10.0.0.99";

    // Request 1: Allowed
    const res1 = await forgotPasswordHandler(
      new NextRequest("http://localhost/api/auth/forgot-password", {
        method: "POST",
        headers: { "x-forwarded-for": ip },
        body: JSON.stringify({ email: testEmail }),
      })
    );
    expect(res1.status).toBe(200);

    // Request 2: Allowed
    const res2 = await forgotPasswordHandler(
      new NextRequest("http://localhost/api/auth/forgot-password", {
        method: "POST",
        headers: { "x-forwarded-for": ip },
        body: JSON.stringify({ email: testEmail }),
      })
    );
    expect(res2.status).toBe(200);

    // Request 3: Allowed
    const res3 = await forgotPasswordHandler(
      new NextRequest("http://localhost/api/auth/forgot-password", {
        method: "POST",
        headers: { "x-forwarded-for": ip },
        body: JSON.stringify({ email: testEmail }),
      })
    );
    expect(res3.status).toBe(200);

    // Request 4: Blocked with HTTP 429
    const res4 = await forgotPasswordHandler(
      new NextRequest("http://localhost/api/auth/forgot-password", {
        method: "POST",
        headers: { "x-forwarded-for": ip },
        body: JSON.stringify({ email: testEmail }),
      })
    );
    expect(res4.status).toBe(429);

    const body4 = await res4.json();
    expect(body4.error).toContain("تم تجاوز الحد المسموح به");
  });

  // ---------------------------------------------------------------------------
  // Rate-Limit Password Reset Attempts: Consecutive Incorrect OTP Submissions
  // ---------------------------------------------------------------------------
  it("AC8: should lock or reject requests after 5 consecutive incorrect OTP submissions (HTTP 429)", async () => {
    // 1. Generate valid OTP
    const forgotReq = new NextRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: testEmail }),
    });
    await forgotPasswordHandler(forgotReq);

    // Attempts 1 to 4: Each incorrect submission returns 400 and decreases remaining attempts
    for (let i = 1; i <= 4; i++) {
      const verifyReq = new NextRequest("http://localhost/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email: testEmail, otp: `99990${i}` }),
      });
      const res = await verifyOtpHandler(verifyReq);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toBe("كود التحقق غير صحيح أو انتهت صلاحيته");
      expect(body.remainingAttempts).toBe(5 - i);
    }

    // Attempt 5: 5th consecutive incorrect submission triggers lockout with HTTP 429
    const fifthReq = new NextRequest("http://localhost/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email: testEmail, otp: "999905" }),
    });
    const fifthRes = await verifyOtpHandler(fifthReq);
    expect(fifthRes.status).toBe(429);

    const fifthBody = await fifthRes.json();
    expect(fifthBody.locked).toBe(true);
    expect(fifthBody.remainingAttempts).toBe(0);
    expect(fifthBody.error).toContain("تم تجاوز الحد الأقصى للمحاولات غير الصحيحة");
  });

  it("AC9: should block even correct OTP submission once locked out (HTTP 429)", async () => {
    // 1. Generate valid OTP
    const forgotReq = new NextRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: testEmail }),
    });
    await forgotPasswordHandler(forgotReq);
    const sentEmail = getLastSentEmail();
    expect(sentEmail).toBeDefined();
    const correctOtp = sentEmail!.otp;

    // 2. Submit 5 incorrect submissions to trigger lock
    for (let i = 1; i <= 5; i++) {
      await verifyOtpHandler(
        new NextRequest("http://localhost/api/auth/verify-otp", {
          method: "POST",
          body: JSON.stringify({ email: testEmail, otp: `11111${i}` }),
        })
      );
    }

    // 3. Submitting the CORRECT OTP now must still be rejected with HTTP 429 because account is locked
    const lockedReq = new NextRequest("http://localhost/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email: testEmail, otp: correctOtp }),
    });
    const lockedRes = await verifyOtpHandler(lockedReq);
    expect(lockedRes.status).toBe(429);

    const lockedBody = await lockedRes.json();
    expect(lockedBody.locked).toBe(true);
    expect(lockedBody.error).toContain("تم تجاوز الحد الأقصى للمحاولات غير الصحيحة");
  });

  it("AC10: should lock requests when consecutive incorrect OTPs are submitted via reset-password endpoint", async () => {
    // 1. Generate valid OTP
    const forgotReq = new NextRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: testEmail }),
    });
    await forgotPasswordHandler(forgotReq);

    // 2. Submit 4 incorrect attempts on /api/auth/reset-password
    for (let i = 1; i <= 4; i++) {
      const resetReq = new NextRequest("http://localhost/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: testEmail,
          otp: `88880${i}`,
          newPassword,
          confirmPassword: newPassword,
        }),
      });
      const res = await resetPasswordHandler(resetReq);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("كود التحقق غير صحيح أو انتهت صلاحيته");
    }

    // 3. 5th attempt locks the account
    const fifthResetReq = new NextRequest("http://localhost/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        email: testEmail,
        otp: "888805",
        newPassword,
        confirmPassword: newPassword,
      }),
    });
    const fifthResetRes = await resetPasswordHandler(fifthResetReq);
    expect(fifthResetRes.status).toBe(429);

    const fifthBody = await fifthResetRes.json();
    expect(fifthBody.locked).toBe(true);
    expect(fifthBody.error).toContain("تم تجاوز الحد الأقصى للمحاولات غير الصحيحة");
  });

  it("AC11: should reset consecutive failure counter upon successful OTP verification", async () => {
    // 1. Generate valid OTP
    const forgotReq = new NextRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: testEmail }),
    });
    await forgotPasswordHandler(forgotReq);
    const sentEmail = getLastSentEmail();
    expect(sentEmail).toBeDefined();

    // 2. Submit 2 incorrect submissions
    for (let i = 1; i <= 2; i++) {
      const res = await verifyOtpHandler(
        new NextRequest("http://localhost/api/auth/verify-otp", {
          method: "POST",
          body: JSON.stringify({ email: testEmail, otp: "000000" }),
        })
      );
      expect(res.status).toBe(400);
    }

    // 3. Submit correct OTP -> resets failed attempts
    const successRes = await verifyOtpHandler(
      new NextRequest("http://localhost/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email: testEmail, otp: sentEmail!.otp }),
      })
    );
    expect(successRes.status).toBe(200);

    // 4. Now a subsequent failed attempt starts fresh with 4 remaining attempts
    const afterSuccessRes = await verifyOtpHandler(
      new NextRequest("http://localhost/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email: testEmail, otp: "999999" }),
      })
    );
    expect(afterSuccessRes.status).toBe(400);
    const afterBody = await afterSuccessRes.json();
    expect(afterBody.remainingAttempts).toBe(4);
  });

  // ---------------------------------------------------------------------------
  // Strict Expiration Timestamp on Password Reset Tokens
  // ---------------------------------------------------------------------------
  it("AC12: should enforce strict expiration timestamp on password reset tokens", async () => {
    // 1. Request password reset and verify strict expiration timestamp is returned
    const beforeRequest = Date.now();
    const forgotReq = new NextRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: testEmail }),
    });
    const forgotRes = await forgotPasswordHandler(forgotReq);
    expect(forgotRes.status).toBe(200);

    const forgotBody = await forgotRes.json();
    expect(forgotBody.expiresAt).toBeDefined();
    expect(typeof forgotBody.expiresAt).toBe("number");
    // Default TTL is 900 seconds (15 minutes)
    expect(forgotBody.expiresAt).toBeGreaterThan(beforeRequest + 890 * 1000);
    expect(forgotBody.expiresAt).toBeLessThanOrEqual(beforeRequest + 910 * 1000);

    // 2. Verify an expired token is strictly rejected
    const expiredEmail = "expired.token@example.com";
    // Save token with TTL = -10 seconds (already in the past)
    await saveOtp(expiredEmail, "654321", -10);

    expect(await isOtpExpired(expiredEmail)).toBe(true);

    // Attempt to verify expired token
    const verifyExpiredReq = new NextRequest("http://localhost/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email: expiredEmail, otp: "654321" }),
    });
    const verifyExpiredRes = await verifyOtpHandler(verifyExpiredReq);
    expect(verifyExpiredRes.status).toBe(400);

    const verifyExpiredBody = await verifyExpiredRes.json();
    expect(verifyExpiredBody.error).toBe("كود التحقق غير صحيح أو انتهت صلاحيته");

    // Attempt to reset password with expired token
    const resetExpiredReq = new NextRequest("http://localhost/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        email: expiredEmail,
        otp: "654321",
        newPassword,
        confirmPassword: newPassword,
      }),
    });
    const resetExpiredRes = await resetPasswordHandler(resetExpiredReq);
    expect(resetExpiredRes.status).toBe(400);

    const resetExpiredBody = await resetExpiredRes.json();
    expect(resetExpiredBody.error).toBe("كود التحقق غير صحيح أو انتهت صلاحيته");
  });

  it("AC13: should support 3-consecutive-incorrect submissions threshold in the 3–5 range", async () => {
    const customEmail = "three.attempts@example.com";
    await saveOtp(customEmail, "333333", 900, 3);

    // Attempt 1: Failed
    const r1 = await verifyOtpDetailed(customEmail, "000001", 3);
    expect(r1.success).toBe(false);
    expect(r1.locked).toBe(false);
    expect(r1.remainingAttempts).toBe(2);

    // Attempt 2: Failed
    const r2 = await verifyOtpDetailed(customEmail, "000002", 3);
    expect(r2.success).toBe(false);
    expect(r2.locked).toBe(false);
    expect(r2.remainingAttempts).toBe(1);

    // Attempt 3: 3rd consecutive failed submission triggers lock
    const r3 = await verifyOtpDetailed(customEmail, "000003", 3);
    expect(r3.success).toBe(false);
    expect(r3.locked).toBe(true);
    expect(r3.remainingAttempts).toBe(0);

    // Check lock status
    const lock = await isOtpLocked(customEmail);
    expect(lock.locked).toBe(true);
  });
});
