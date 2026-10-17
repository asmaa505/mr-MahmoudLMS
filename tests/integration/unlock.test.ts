import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { POST as unlockHandler } from "@/app/api/student/unlock/route";
import { POST as redeemHandler } from "@/app/api/codes/redeem/route";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { resetRateLimitCache } from "@/lib/rateLimit";
import { AsyncLocalStorage } from "async_hooks";

const tokenStorage = new AsyncLocalStorage<string>();

vi.mock("next/headers", () => {
  const cookieStore = {
    set: vi.fn(),
    get: (key: string) => {
      if (key === "auth_token") {
        const scoped = tokenStorage.getStore();
        return { value: scoped !== undefined ? scoped : ((globalThis as any).__mockToken || "") };
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

  it("should prevent concurrent activation code redemption between multiple students using atomic transaction (POST /api/student/unlock)", async () => {
    const concurrentCourseId = "course-concurrent-unlock-1";
    const concurrentCode = "CODE-CONCURRENT-UNLOCK-1";
    const student1Phone = "01811111111";
    const student2Phone = "01822222222";

    // 1. Cleanup old test data
    await db.activationCode.deleteMany({ where: { code: concurrentCode } });
    await db.enrollment.deleteMany({ where: { courseId: concurrentCourseId } });
    await db.course.deleteMany({ where: { id: concurrentCourseId } });
    await db.user.deleteMany({ where: { phone: { in: [student1Phone, student2Phone] } } });

    // 2. Create course and activation code
    await db.course.create({
      data: {
        id: concurrentCourseId,
        title: "كورس اختبار التزامن 1",
        grade: "3",
        isPublished: true,
      },
    });

    await db.activationCode.create({
      data: {
        code: concurrentCode,
        courseId: concurrentCourseId,
      },
    });

    // 3. Create two students and their session tokens
    const student1 = await db.user.create({
      data: {
        name: "طالب متزامن 1",
        phone: student1Phone,
        password: "password123",
        grade: "3",
        role: "STUDENT",
        isApproved: true,
      },
    });

    const student2 = await db.user.create({
      data: {
        name: "طالب متزامن 2",
        phone: student2Phone,
        password: "password123",
        grade: "3",
        role: "STUDENT",
        isApproved: true,
      },
    });

    const token1 = signToken({
      userId: student1.id,
      role: student1.role,
      name: student1.name,
      phone: student1.phone,
      sessionId: crypto.randomUUID(),
    });
    await db.session.create({ data: { token: token1, userId: student1.id } });

    const token2 = signToken({
      userId: student2.id,
      role: student2.role,
      name: student2.name,
      phone: student2.phone,
      sessionId: crypto.randomUUID(),
    });
    await db.session.create({ data: { token: token2, userId: student2.id } });

    // 4. Fire concurrent redemption requests simultaneously
    const [res1, res2] = await Promise.all([
      tokenStorage.run(token1, () =>
        unlockHandler(
          new NextRequest("http://localhost/api/student/unlock", {
            method: "POST",
            headers: { "x-forwarded-for": "10.0.1.1" },
            body: JSON.stringify({ code: concurrentCode }),
          })
        )
      ),
      tokenStorage.run(token2, () =>
        unlockHandler(
          new NextRequest("http://localhost/api/student/unlock", {
            method: "POST",
            headers: { "x-forwarded-for": "10.0.1.2" },
            body: JSON.stringify({ code: concurrentCode }),
          })
        )
      ),
    ]);

    const statuses = [res1.status, res2.status].sort();
    // Exactly one student succeeds (200), and the second is rejected (400)
    expect(statuses).toEqual([200, 400]);

    // 5. Verify database integrity
    const codeInDb = await db.activationCode.findUnique({ where: { code: concurrentCode } });
    expect(codeInDb?.isUsed).toBe(true);
    expect([student1.id, student2.id]).toContain(codeInDb?.usedById);

    // Verify only ONE enrollment exists for the course
    const enrollments = await db.enrollment.findMany({ where: { courseId: concurrentCourseId } });
    expect(enrollments.length).toBe(1);
    expect(enrollments[0].userId).toBe(codeInDb?.usedById);

    // Cleanup
    await db.activationCode.deleteMany({ where: { code: concurrentCode } });
    await db.enrollment.deleteMany({ where: { courseId: concurrentCourseId } });
    await db.course.deleteMany({ where: { id: concurrentCourseId } });
    await db.session.deleteMany({ where: { userId: { in: [student1.id, student2.id] } } });
    await db.user.deleteMany({ where: { id: { in: [student1.id, student2.id] } } });
  });

  it("should prevent concurrent activation code redemption between multiple students using atomic transaction (POST /api/codes/redeem)", async () => {
    const concurrentCourseId = "course-concurrent-redeem-2";
    const concurrentCode = "CODE-CONCURRENT-REDEEM-2";
    const student3Phone = "01833333333";
    const student4Phone = "01844444444";

    // 1. Cleanup old test data
    await db.activationCode.deleteMany({ where: { code: concurrentCode } });
    await db.enrollment.deleteMany({ where: { courseId: concurrentCourseId } });
    await db.course.deleteMany({ where: { id: concurrentCourseId } });
    await db.user.deleteMany({ where: { phone: { in: [student3Phone, student4Phone] } } });

    // 2. Create course and activation code
    await db.course.create({
      data: {
        id: concurrentCourseId,
        title: "كورس اختبار التزامن 2",
        grade: "3",
        isPublished: true,
      },
    });

    await db.activationCode.create({
      data: {
        code: concurrentCode,
        courseId: concurrentCourseId,
      },
    });

    // 3. Create two students and their session tokens
    const student3 = await db.user.create({
      data: {
        name: "طالب متزامن 3",
        phone: student3Phone,
        password: "password123",
        grade: "3",
        role: "STUDENT",
        isApproved: true,
      },
    });

    const student4 = await db.user.create({
      data: {
        name: "طالب متزامن 4",
        phone: student4Phone,
        password: "password123",
        grade: "3",
        role: "STUDENT",
        isApproved: true,
      },
    });

    const token3 = signToken({
      userId: student3.id,
      role: student3.role,
      name: student3.name,
      phone: student3.phone,
      sessionId: crypto.randomUUID(),
    });
    await db.session.create({ data: { token: token3, userId: student3.id } });

    const token4 = signToken({
      userId: student4.id,
      role: student4.role,
      name: student4.name,
      phone: student4.phone,
      sessionId: crypto.randomUUID(),
    });
    await db.session.create({ data: { token: token4, userId: student4.id } });

    // 4. Fire concurrent redemption requests simultaneously
    const [res3, res4] = await Promise.all([
      tokenStorage.run(token3, () =>
        redeemHandler(
          new NextRequest("http://localhost/api/codes/redeem", {
            method: "POST",
            headers: { "x-forwarded-for": "10.0.2.1" },
            body: JSON.stringify({ code: concurrentCode }),
          })
        )
      ),
      tokenStorage.run(token4, () =>
        redeemHandler(
          new NextRequest("http://localhost/api/codes/redeem", {
            method: "POST",
            headers: { "x-forwarded-for": "10.0.2.2" },
            body: JSON.stringify({ code: concurrentCode }),
          })
        )
      ),
    ]);

    const statuses = [res3.status, res4.status].sort();
    // Exactly one student succeeds (200), and the second is rejected (400)
    expect(statuses).toEqual([200, 400]);

    const bodySuccess = res3.status === 200 ? await res3.json() : await res4.json();
    const bodyFailure = res3.status === 400 ? await res3.json() : await res4.json();
    expect(bodySuccess.success).toBe(true);
    expect(bodyFailure.success).toBe(false);
    expect(bodyFailure.error).toBe("هذا الكود مستخدم من قبل");

    // 5. Verify database integrity
    const codeInDb = await db.activationCode.findUnique({ where: { code: concurrentCode } });
    expect(codeInDb?.isUsed).toBe(true);
    expect([student3.id, student4.id]).toContain(codeInDb?.usedById);

    // Verify only ONE enrollment exists for the course
    const enrollments = await db.enrollment.findMany({ where: { courseId: concurrentCourseId } });
    expect(enrollments.length).toBe(1);
    expect(enrollments[0].userId).toBe(codeInDb?.usedById);

    // Cleanup
    await db.activationCode.deleteMany({ where: { code: concurrentCode } });
    await db.enrollment.deleteMany({ where: { courseId: concurrentCourseId } });
    await db.course.deleteMany({ where: { id: concurrentCourseId } });
    await db.session.deleteMany({ where: { userId: { in: [student3.id, student4.id] } } });
    await db.user.deleteMany({ where: { id: { in: [student3.id, student4.id] } } });
  });
});
