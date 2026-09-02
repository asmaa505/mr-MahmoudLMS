import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resetRateLimitCache } from "@/lib/rateLimit";
import { vi } from "vitest";

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
  const testPhone = "01999999999";
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
    expect(body.error).toBe("جميع الحقول مطلوبة");
  });

  it("should successfully register a new student with pending approval", async () => {
    const req = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: testName,
        phone: testPhone,
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
        password: testPassword,
        grade: testGrade,
      }),
    });

    const res = await registerHandler(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe("رقم الهاتف مسجل بالفعل");
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
});
