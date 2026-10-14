import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { POST as forgotPasswordHandler } from "@/app/api/auth/forgot-password/route";
import { POST as verifyOtpHandler } from "@/app/api/auth/verify-otp/route";
import { POST as resetPasswordHandler } from "@/app/api/auth/reset-password/route";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { resetOtpStore, saveOtp } from "@/lib/otp";
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
});
