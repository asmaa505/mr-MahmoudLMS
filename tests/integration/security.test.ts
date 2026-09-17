import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { GET as videoStreamHandler } from "@/app/api/video/stream/route";
import { GET as documentDownloadHandler } from "@/app/api/document/download/route";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as quizSubmitHandler } from "@/app/api/student/quiz/submit/route";
import { approveStudentAction, blockStudentAction } from "@/app/admin/students/actions";
import { deleteCourseAction } from "@/app/admin/courses/actions";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";

vi.mock("next/headers", () => {
  const cookieStore = {
    set: vi.fn(),
    get: (key: string) => {
      if (key === "auth_token") {
        return { value: (globalThis as any).__mockSecurityToken || "" };
      }
      return null;
    },
    delete: vi.fn(),
  };
  return {
    cookies: () => Promise.resolve(cookieStore),
    headers: () => Promise.resolve(new Headers({ "x-forwarded-for": "127.0.0.1" })),
  };
});

describe("Security & Access Control Integration Tests", () => {
  const adminPhone = "01099999901";
  const enrolledStudentPhone = "01099999902";
  const unEnrolledStudentPhone = "01099999903";

  let adminToken = "";
  let enrolledStudentToken = "";
  let unEnrolledStudentToken = "";

  let adminUser: any;
  let enrolledStudent: any;
  let unEnrolledStudent: any;

  let testCourse: any;
  let testChapter: any;
  let testLecture: any;
  let testHomework: any;
  let testQuiz: any;

  beforeAll(async () => {
    // Cleanup prior runs
    await db.user.deleteMany({
      where: { phone: { in: [adminPhone, enrolledStudentPhone, unEnrolledStudentPhone] } },
    });

    // Create Admin
    adminUser = await db.user.create({
      data: {
        name: "أدمن تجريبي سيكيوريتي",
        phone: adminPhone,
        password: "secure_pass_123",
        role: "ADMIN",
        isApproved: true,
      },
    });
    const adminSessionId = crypto.randomUUID();
    adminToken = signToken({
      userId: adminUser.id,
      role: adminUser.role,
      name: adminUser.name,
      phone: adminUser.phone,
      sessionId: adminSessionId,
    });
    await db.session.create({ data: { token: adminToken, userId: adminUser.id } });

    // Create Enrolled Student
    enrolledStudent = await db.user.create({
      data: {
        name: "طالب مشترك تجريبي",
        phone: enrolledStudentPhone,
        password: "secure_pass_123",
        role: "STUDENT",
        isApproved: true,
      },
    });
    const enrolledSessionId = crypto.randomUUID();
    enrolledStudentToken = signToken({
      userId: enrolledStudent.id,
      role: enrolledStudent.role,
      name: enrolledStudent.name,
      phone: enrolledStudent.phone,
      sessionId: enrolledSessionId,
    });
    await db.session.create({ data: { token: enrolledStudentToken, userId: enrolledStudent.id } });

    // Create Unenrolled Student
    unEnrolledStudent = await db.user.create({
      data: {
        name: "طالب غير مشترك تجريبي",
        phone: unEnrolledStudentPhone,
        password: "secure_pass_123",
        role: "STUDENT",
        isApproved: true,
      },
    });
    const unEnrolledSessionId = crypto.randomUUID();
    unEnrolledStudentToken = signToken({
      userId: unEnrolledStudent.id,
      role: unEnrolledStudent.role,
      name: unEnrolledStudent.name,
      phone: unEnrolledStudent.phone,
      sessionId: unEnrolledSessionId,
    });
    await db.session.create({ data: { token: unEnrolledStudentToken, userId: unEnrolledStudent.id } });

    // Create Course hierarchy
    testCourse = await db.course.create({
      data: {
        title: "كورس الأمان الفيزيائي التجريبي",
        grade: "الصف الثالث الثانوي",
        isPublished: true,
      },
    });

    testChapter = await db.chapter.create({
      data: {
        title: "الفصل الأول التجريبي",
        order: 1,
        courseId: testCourse.id,
      },
    });

    testLecture = await db.lecture.create({
      data: {
        title: "محاضرة الكهربية 1",
        videoUrl: "/uploads/videos/test-sample.mp4",
        duration: "10:00",
        order: 1,
        chapterId: testChapter.id,
      },
    });

    testHomework = await db.homework.create({
      data: {
        title: "ملف واجب الحصة 1",
        pdfUrl: "/uploads/documents/test-homework.pdf",
        chapterId: testChapter.id,
      },
    });

    testQuiz = await db.quiz.create({
      data: {
        title: "كويز الفصل الأول",
        duration: 15,
        passingScore: 60,
        chapterId: testChapter.id,
      },
    });

    // Enroll only enrolledStudent
    await db.enrollment.create({
      data: {
        userId: enrolledStudent.id,
        courseId: testCourse.id,
      },
    });
  });

  afterAll(async () => {
    // Delete created course hierarchy and users
    if (testCourse) {
      await db.course.delete({ where: { id: testCourse.id } }).catch(() => {});
    }
    await db.user.deleteMany({
      where: { phone: { in: [adminPhone, enrolledStudentPhone, unEnrolledStudentPhone] } },
    }).catch(() => {});
  });

  it("should reject video streaming for unauthenticated requests (401)", async () => {
    (globalThis as any).__mockSecurityToken = "";

    const req = new NextRequest(`http://localhost/api/video/stream?lectureId=${testLecture.id}`);
    const res = await videoStreamHandler(req);
    expect(res.status).toBe(401);
  });

  it("should reject video streaming for students not enrolled in the course (403)", async () => {
    (globalThis as any).__mockSecurityToken = unEnrolledStudentToken;

    const req = new NextRequest(`http://localhost/api/video/stream?lectureId=${testLecture.id}`);
    const res = await videoStreamHandler(req);
    expect(res.status).toBe(403);
  });

  it("should reject document download for unenrolled students (403)", async () => {
    (globalThis as any).__mockSecurityToken = unEnrolledStudentToken;

    const req = new NextRequest(`http://localhost/api/document/download?homeworkId=${testHomework.id}`);
    const res = await documentDownloadHandler(req);
    expect(res.status).toBe(403);
  });

  it("should reject quiz submission for unenrolled students (403)", async () => {
    (globalThis as any).__mockSecurityToken = unEnrolledStudentToken;

    const req = new NextRequest(`http://localhost/api/student/quiz/submit`, {
      method: "POST",
      body: JSON.stringify({
        quizId: testQuiz.id,
        answers: {},
      }),
    });
    const res = await quizSubmitHandler(req);
    expect(res.status).toBe(403);
  });

  it("should throw authorization error when non-admin calls admin server actions", async () => {
    (globalThis as any).__mockSecurityToken = enrolledStudentToken;

    const formData = new FormData();
    formData.append("studentId", unEnrolledStudent.id);

    // approveStudentAction must reject non-admins
    await expect(approveStudentAction(formData)).rejects.toThrow();

    // blockStudentAction must reject non-admins
    await expect(blockStudentAction(formData)).rejects.toThrow();

    // deleteCourseAction must reject non-admins
    const courseForm = new FormData();
    courseForm.append("courseId", testCourse.id);
    await expect(deleteCourseAction(courseForm)).rejects.toThrow();
  });

  it("should throttle registration attempts when exceeding rate limit (429)", async () => {
    const rapidIp = "192.168.99.10";
    let lastStatus = 200;

    // Send rapid requests from the same IP
    for (let i = 0; i < 12; i++) {
      const req = new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "x-forwarded-for": rapidIp },
        body: JSON.stringify({
          name: `بوت ${i}`,
          phone: `0100000${i.toString().padStart(4, "0")}`,
          password: "password123",
          grade: "الصف الأول الثانوي",
        }),
      });

      const res = await registerHandler(req);
      lastStatus = res.status;
      if (res.status === 429) {
        break;
      }
    }

    expect(lastStatus).toBe(429);
  });
});
