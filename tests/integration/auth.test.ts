import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { comparePassword } from "@/lib/auth";
import { sanitizePayload } from "@/lib/sanitize";
import { resetRateLimitCache } from "@/lib/rateLimit";

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

describe("Authentication API Integration Tests", () => {
  const testPhone = "01099999999";
  const testPassword = "securePassword123";
  const testName = "صلاح الدين";
  const testGrade = "3";
  let createdUserId: string | null = null;

  beforeAll(async () => {
    // Cleanup any orphaned test records
    await db.user.deleteMany({ where: { phone: testPhone } });
  });

  afterAll(async () => {
    // Final cleanup of the created student account
    if (createdUserId) {
      await db.session.deleteMany({ where: { userId: createdUserId } });
      await db.user.delete({ where: { id: createdUserId } });
    }
  });

  beforeEach(() => {
    // Reset IP rate limits before each test run
    resetRateLimitCache();
  });

  it("should fail registration if fields are missing", async () => {
    const req = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ phone: testPhone }),
    });

    const res = await registerHandler(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain("جميع الحقول مطلوبة");
  });

  it("should successfully register a new student with pending approval", async () => {
    const req = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: testName,
        phone: testPhone,
        parentPhone: "01188888888",
        password: testPassword,
        grade: testGrade,
      }),
    });

    const res = await registerHandler(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.message).toContain("تم التسجيل بنجاح");
    expect(body.userId).toBeDefined();
    createdUserId = body.userId;

    // Verify in db that isApproved defaults to false
    const dbUser = await db.user.findUnique({ where: { id: createdUserId! } });
    expect(dbUser).toBeDefined();
    expect(dbUser?.isApproved).toBe(false);
  });

  it("should block duplicate registrations using same phone number", async () => {
    const req = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: testName,
        phone: testPhone,
        parentPhone: "01188888888",
        password: testPassword,
        grade: testGrade,
      }),
    });

    const res = await registerHandler(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain("مسجل بالفعل");
  });

  it("should prevent login if the account is not yet approved by admin", async () => {
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        phone: testPhone,
        password: testPassword,
      }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.error).toContain("حسابك قيد الانتظار لموافقة");
  });

  it("should verify password and successfully login after admin approval", async () => {
    // Admin approves the student
    await db.user.update({
      where: { id: createdUserId! },
      data: { isApproved: true },
    });

    // Test with wrong password
    const reqWrong = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        phone: testPhone,
        password: "incorrectPassword",
      }),
    });

    const resWrong = await loginHandler(reqWrong);
    expect(resWrong.status).toBe(401);

    const bodyWrong = await resWrong.json();
    expect(bodyWrong.error).toBe("بيانات الدخول غير صحيحة");

    // Test with correct password
    const reqCorrect = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        phone: testPhone,
        password: testPassword,
      }),
    });

    const resCorrect = await loginHandler(reqCorrect);
    expect(resCorrect.status).toBe(200);

    const bodyCorrect = await resCorrect.json();
    expect(bodyCorrect.message).toBe("تم تسجيل الدخول بنجاح");
    expect(bodyCorrect.user).toBeDefined();
    expect(bodyCorrect.user.name).toBe(testName);
  });

  it("should trigger HTTP 429 Too Many Requests if rate limits are exceeded", async () => {
    // Generate 16 requests from same IP in rapid succession (limit is 15)
    let lastResStatus = 200;
    const ip = "192.168.1.55";

    for (let i = 0; i < 16; i++) {
      const req = new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "x-forwarded-for": ip },
        body: JSON.stringify({
          phone: testPhone,
          password: testPassword,
        }),
      });
      const res = await loginHandler(req);
      lastResStatus = res.status;
    }

    expect(lastResStatus).toBe(429);
  });

  it("should process raw password with special characters without HTML sanitization or string mutations during registration and login", async () => {
    const rawPassPhone = "01077777777";
    const rawSpecialPassword = "P@ss<w0rd>&\"'/! 123";
    let specialUserId: string | null = null;

    try {
      await db.user.deleteMany({ where: { phone: rawPassPhone } });

      // 1. Register student with special characters in password
      const registerReq = new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "طالب كلمة مرور خاصة",
          phone: rawPassPhone,
          parentPhone: "01177777777",
          password: rawSpecialPassword,
          grade: "3",
        }),
      });

      const registerRes = await registerHandler(registerReq);
      expect(registerRes.status).toBe(201);
      const registerBody = await registerRes.json();
      specialUserId = registerBody.userId;

      // 2. Verify stored bcrypt hash matches RAW password directly, NOT an HTML-sanitized version
      const storedUser = await db.user.findUnique({ where: { id: specialUserId! } });
      expect(storedUser).toBeDefined();

      const matchesRaw = await comparePassword(rawSpecialPassword, storedUser!.password);
      expect(matchesRaw).toBe(true);

      const htmlSanitizedPassword = "P@ss&lt;w0rd&gt;&amp;&quot;&#x27;&#x2F;! 123";
      const matchesHtmlSanitized = await comparePassword(htmlSanitizedPassword, storedUser!.password);
      expect(matchesHtmlSanitized).toBe(false);

      // 3. Admin approves account
      await db.user.update({
        where: { id: specialUserId! },
        data: { isApproved: true },
      });

      // 4. Login with exact raw password directly succeeds
      const loginReq = new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          phone: rawPassPhone,
          password: rawSpecialPassword,
        }),
      });

      const loginRes = await loginHandler(loginReq);
      expect(loginRes.status).toBe(200);

      // 5. Attempting to login with HTML-mutated password fails (rejects mutated input)
      const mutatedLoginReq = new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          phone: rawPassPhone,
          password: htmlSanitizedPassword,
        }),
      });

      const mutatedLoginRes = await loginHandler(mutatedLoginReq);
      expect(mutatedLoginRes.status).toBe(401);
    } finally {
      if (specialUserId) {
        await db.session.deleteMany({ where: { userId: specialUserId } });
        await db.user.deleteMany({ where: { id: specialUserId } });
      }
      await db.user.deleteMany({ where: { phone: rawPassPhone } });
    }
  });

  it("should preserve passwords without mutation in sanitizePayload utility", () => {
    const rawPassword = "Raw<Password>&'\"/ 999";
    const payload = {
      name: "<b>Test Name</b>",
      phone: "01012345678",
      password: rawPassword,
      confirmPassword: rawPassword,
      newPassword: rawPassword,
    };

    const sanitized = sanitizePayload(payload);
    expect(sanitized.name).toBe("&lt;b&gt;Test Name&lt;&#x2F;b&gt;");
    expect(sanitized.password).toBe(rawPassword);
    expect(sanitized.confirmPassword).toBe(rawPassword);
    expect(sanitized.newPassword).toBe(rawPassword);
  });
});

