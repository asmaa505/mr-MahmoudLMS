import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { POST as unlockHandler } from "@/app/api/student/unlock/route";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { resetRateLimitCache } from "@/lib/rateLimit";
import { vi } from "vitest";

vi.mock("next/headers", () => {
  const cookieStore = {
    set: vi.fn(),
    get: (key: string) => {
      if (key === "auth_token") {
        return { value: (globalThis as any).__mockToken || "" };
      }
      return null;
    },
    delete: vi.fn(),
  };
  return {
    cookies: () => Promise.resolve(cookieStore),
  };
});

describe("Course Activation Code API Integration Tests", () => {
  const testPhone = "01888888888";
  const testPassword = "password123";
  const testCode = "TEST-CODE-XYZ-2026";
  const testCourseId = "test-course-id-999";
  let studentToken = "";
  let testUserId = "";

  beforeAll(async () => {
    // 1. Cleanup old mock data
    await db.activationCode.deleteMany({ where: { code: testCode } });
    await db.enrollment.deleteMany({ where: { courseId: testCourseId } });
    await db.course.deleteMany({ where: { id: testCourseId } });
    await db.user.deleteMany({ where: { phone: testPhone } });

    // 2. Create test course
    await db.course.create({
      data: {
        id: testCourseId,
        title: "كورس الفيزياء التجريبي",
        grade: "3",
        isPublished: true,
      },
    });

    // 3. Create approved student user
    const student = await db.user.create({
      data: {
        name: "طالب مجتهد",
        phone: testPhone,
        password: testPassword,
        grade: "3",
        role: "STUDENT",
        isApproved: true,
      },
    });
    testUserId = student.id;

    // 4. Create active session token
    const sessionId = crypto.randomUUID();
    studentToken = signToken({
      userId: student.id,
      role: student.role,
      name: student.name,
      phone: student.phone,
      sessionId,
    });

    await db.session.create({
      data: {
        token: studentToken,
        userId: student.id,
      },
    });
  });

  afterAll(async () => {
    // Final cleanup of database records
    await db.activationCode.deleteMany({ where: { code: testCode } });
    await db.enrollment.deleteMany({ where: { courseId: testCourseId } });
    await db.course.deleteMany({ where: { id: testCourseId } });
    if (testUserId) {
      await db.session.deleteMany({ where: { userId: testUserId } });
      await db.user.delete({ where: { id: testUserId } });
    }
  });

  beforeEach(() => {
    resetRateLimitCache();
    (globalThis as any).__mockToken = studentToken;
  });

  it("should fail if request contains no code", async () => {
    const req = new NextRequest("http://localhost/api/student/unlock", {
      method: "POST",
      headers: {
        cookie: `auth_token=${studentToken}`,
      },
      body: JSON.stringify({}),
    });

    const res = await unlockHandler(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe("يرجى إدخال كود التفعيل");
  });

  it("should return HTTP 404 if code does not exist in database", async () => {
    const req = new NextRequest("http://localhost/api/student/unlock", {
      method: "POST",
      headers: {
        cookie: `auth_token=${studentToken}`,
      },
      body: JSON.stringify({ code: "INVALID-CODE-9999" }),
    });

    const res = await unlockHandler(req);
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error).toContain("كود تفعيل غير صحيح");
  });

  it("should successfully activate course using valid code", async () => {
    // Insert valid code into database first
    await db.activationCode.create({
      data: {
        code: testCode,
        courseId: testCourseId,
      },
    });

    const req = new NextRequest("http://localhost/api/student/unlock", {
      method: "POST",
      headers: {
        cookie: `auth_token=${studentToken}`,
      },
      body: JSON.stringify({ code: testCode }),
    });

    const res = await unlockHandler(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.message).toContain("تم بنجاح تفعيل واشتراك");

    // Verify student is now enrolled
    const enrollment = await db.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: testUserId,
          courseId: testCourseId,
        },
      },
    });
    expect(enrollment).toBeDefined();

    // Verify code is marked as used
    const codeRecord = await db.activationCode.findUnique({
      where: { code: testCode },
    });
    expect(codeRecord?.isUsed).toBe(true);
    expect(codeRecord?.usedById).toBe(testUserId);
  });

  it("should block activation attempts if code is already used", async () => {
    const req = new NextRequest("http://localhost/api/student/unlock", {
      method: "POST",
      headers: {
        cookie: `auth_token=${studentToken}`,
      },
      body: JSON.stringify({ code: testCode }),
    });

    const res = await unlockHandler(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain("كود تفعيل غير صحيح أو تم استخدامه بالفعل");
  });
});
