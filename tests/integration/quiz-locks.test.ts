import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { GET as quizParamHandler } from "@/app/api/student/quiz/[id]/route";
import { GET as quizQueryHandler } from "@/app/api/student/quiz/route";
import { POST as quizSubmitHandler } from "@/app/api/student/quiz/submit/route";
import { inspectQuizPrerequisites, quizAccessMiddleware } from "@/lib/quiz-lock";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";

vi.mock("next/headers", () => {
  const cookieStore = {
    set: vi.fn(),
    get: (key: string) => {
      if (key === "auth_token") {
        return { value: (globalThis as any).__mockQuizLockToken || "" };
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

describe("Mandatory Quiz Locks Server-Side Access Control", () => {
  const adminPhone = "01077777701";
  const enrolledStudentPhone = "01077777702";
  const unenrolledStudentPhone = "01077777703";

  let adminToken = "";
  let enrolledStudentToken = "";
  let unenrolledStudentToken = "";

  let adminUser: any;
  let enrolledStudent: any;
  let unenrolledStudent: any;

  let course: any;
  let chapter1: any;
  let chapter2: any;
  let chapter1Lecture: any;
  let chapter2Lecture: any;
  let chapter1Quiz: any;
  let chapter2Quiz: any;

  beforeAll(async () => {
    // 1. Clean up potential old test data
    await db.user.deleteMany({
      where: { phone: { in: [adminPhone, enrolledStudentPhone, unenrolledStudentPhone] } },
    });

    // 2. Create Admin
    adminUser = await db.user.create({
      data: {
        name: "مستر محمود الشحات",
        phone: adminPhone,
        password: "secure_pass_admin",
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

    // 3. Create Enrolled Student
    enrolledStudent = await db.user.create({
      data: {
        name: "طالب مجتهد مشترك",
        phone: enrolledStudentPhone,
        password: "secure_pass_student",
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

    // 4. Create Unenrolled Student
    unenrolledStudent = await db.user.create({
      data: {
        name: "طالب متسلل غير مشترك",
        phone: unenrolledStudentPhone,
        password: "secure_pass_student",
        role: "STUDENT",
        isApproved: true,
      },
    });
    const unenrolledSessionId = crypto.randomUUID();
    unenrolledStudentToken = signToken({
      userId: unenrolledStudent.id,
      role: unenrolledStudent.role,
      name: unenrolledStudent.name,
      phone: unenrolledStudent.phone,
      sessionId: unenrolledSessionId,
    });
    await db.session.create({ data: { token: unenrolledStudentToken, userId: unenrolledStudent.id } });

    // 5. Create Course Hierarchy:
    // Course -> Chapter 1 (Order 1, Lecture 1, Quiz 1 [Mandatory])
    //        -> Chapter 2 (Order 2, Lecture 2, Quiz 2 [Mandatory])
    course = await db.course.create({
      data: {
        title: "كورس الفيزياء الحديثة - قفل الاختبارات",
        grade: "3",
        isPublished: true,
      },
    });

    chapter1 = await db.chapter.create({
      data: {
        title: "الفصل الأول: التأثير الكهروضوئي",
        order: 1,
        courseId: course.id,
      },
    });

    chapter1Lecture = await db.lecture.create({
      data: {
        title: "المحاضرة 1: فوتونات أينشتاين",
        videoUrl: "/uploads/videos/photoelectric.mp4",
        duration: "25:00",
        order: 1,
        chapterId: chapter1.id,
      },
    });

    chapter1Quiz = await db.quiz.create({
      data: {
        title: "امتحان الفصل الأول الإلزامي",
        duration: 20,
        passingScore: 60,
        maxAttempts: 3,
        isMandatory: true,
        chapterId: chapter1.id,
      },
    });

    await db.question.create({
      data: {
        quizId: chapter1Quiz.id,
        type: "MCQ",
        text: "ما هي دالة الشغل للمعدن؟",
        options: JSON.stringify(["أقل طاقة لتحرير إلكترون", "أقصى طاقة حركية", "ثابت بلانك", "سرعة الضوء"]),
        correctOption: 0,
        explanation: "دالة الشغل تمثل أقل طاقة كافية لتحرير الإلكترون دون إكسابه طاقة حركة.",
      },
    });

    chapter2 = await db.chapter.create({
      data: {
        title: "الفصل الثاني: ظاهرة كومتون",
        order: 2,
        courseId: course.id,
      },
    });

    chapter2Lecture = await db.lecture.create({
      data: {
        title: "المحاضرة 1: تصادم الفوتون والإلكترون",
        videoUrl: "/uploads/videos/compton.mp4",
        duration: "30:00",
        order: 1,
        chapterId: chapter2.id,
      },
    });

    chapter2Quiz = await db.quiz.create({
      data: {
        title: "امتحان الفصل الثاني الإلزامي",
        duration: 20,
        passingScore: 60,
        maxAttempts: 3,
        isMandatory: true,
        chapterId: chapter2.id,
      },
    });

    await db.question.create({
      data: {
        quizId: chapter2Quiz.id,
        type: "MCQ",
        text: "في ظاهرة كومتون، ماذا يحدث للطول الموجي للفوتون المشتت؟",
        options: JSON.stringify(["يزداد", "يقل", "يظل ثابتاً", "ينعدم"]),
        correctOption: 0,
        explanation: "نتيجة فقد الفوتون لجزء من طاقته فإن تردده يقل وطوله الموجي يزداد.",
      },
    });

    // 6. Enroll only enrolledStudent into the course
    await db.enrollment.create({
      data: {
        userId: enrolledStudent.id,
        courseId: course.id,
      },
    });
  });

  afterAll(async () => {
    if (course) {
      await db.course.delete({ where: { id: course.id } }).catch(() => {});
    }
    await db.user.deleteMany({
      where: { phone: { in: [adminPhone, enrolledStudentPhone, unenrolledStudentPhone] } },
    }).catch(() => {});
  });

  beforeEach(async () => {
    (globalThis as any).__mockQuizLockToken = enrolledStudentToken;
  });

  it("AC2: should reject quiz content retrieval for unauthenticated requests with HTTP 401", async () => {
    (globalThis as any).__mockQuizLockToken = "";

    const req = new NextRequest(`http://localhost/api/student/quiz/${chapter1Quiz.id}`);
    const res = await quizParamHandler(req, { params: Promise.resolve({ id: chapter1Quiz.id }) });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("غير مصرح: يرجى تسجيل الدخول");
  });

  it("AC2: should reject unauthorized quiz access for unenrolled students with 403 Forbidden", async () => {
    (globalThis as any).__mockQuizLockToken = unenrolledStudentToken;

    const req = new NextRequest(`http://localhost/api/student/quiz/${chapter1Quiz.id}`);
    const res = await quizParamHandler(req, { params: Promise.resolve({ id: chapter1Quiz.id }) });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("يجب الاشتراك وتفعيل الكورس");
    expect(body.code).toBe("NOT_ENROLLED");
  });

  it("AC1 & AC2: should reject quiz content retrieval with 403 Forbidden when prerequisite lecture has not been completed", async () => {
    (globalThis as any).__mockQuizLockToken = enrolledStudentToken;

    // Verify enrolled student has NOT completed chapter1Lecture
    const progress = await db.lessonProgress.findUnique({
      where: {
        userId_lectureId: {
          userId: enrolledStudent.id,
          lectureId: chapter1Lecture.id,
        },
      },
    });
    expect(progress).toBeNull();

    // Student tries to access quiz content directly
    const req = new NextRequest(`http://localhost/api/student/quiz/${chapter1Quiz.id}`);
    const res = await quizParamHandler(req, { params: Promise.resolve({ id: chapter1Quiz.id }) });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("يجب مشاهدة المحاضرة التمهيدية");
    expect(body.code).toBe("PREREQUISITE_LECTURE_NOT_COMPLETED");
    expect(body.locked).toBe(true);
  });

  it("AC1 & AC2: should reject quiz submission with 403 Forbidden when prerequisite lecture has not been completed", async () => {
    (globalThis as any).__mockQuizLockToken = enrolledStudentToken;

    // Student attempts to submit answers to chapter1Quiz without watching chapter1Lecture
    const req = new NextRequest(`http://localhost/api/student/quiz/submit`, {
      method: "POST",
      body: JSON.stringify({
        quizId: chapter1Quiz.id,
        answers: {},
      }),
    });
    const res = await quizSubmitHandler(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("يجب مشاهدة المحاضرة التمهيدية");
    expect(body.code).toBe("PREREQUISITE_LECTURE_NOT_COMPLETED");
  });

  it("AC1 & AC2: should reject subsequent chapter quiz access with 403 Forbidden when previous chapter mandatory quiz has not been passed", async () => {
    (globalThis as any).__mockQuizLockToken = enrolledStudentToken;

    // Mark chapter 2 lecture completed, but chapter 1 quiz was never taken
    await db.lessonProgress.upsert({
      where: {
        userId_lectureId: {
          userId: enrolledStudent.id,
          lectureId: chapter2Lecture.id,
        },
      },
      create: {
        userId: enrolledStudent.id,
        lectureId: chapter2Lecture.id,
        isCompleted: true,
        watchPercentage: 100,
      },
      update: {
        isCompleted: true,
        watchPercentage: 100,
      },
    });

    // Student tries to access Chapter 2 Quiz bypassing Chapter 1's mandatory quiz
    const req = new NextRequest(`http://localhost/api/student/quiz/${chapter2Quiz.id}`);
    const res = await quizParamHandler(req, { params: Promise.resolve({ id: chapter2Quiz.id }) });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("يجب أولاً اجتياز اختبار الفصل السابق");
    expect(body.code).toBe("PREVIOUS_MANDATORY_QUIZ_NOT_PASSED");
    expect(body.locked).toBe(true);
  });

  it("AC1 & AC2: should reject subsequent chapter quiz access with 403 Forbidden when previous chapter quiz was attempted but failed (< passingScore)", async () => {
    (globalThis as any).__mockQuizLockToken = enrolledStudentToken;

    // Complete chapter 1 lecture
    await db.lessonProgress.upsert({
      where: {
        userId_lectureId: {
          userId: enrolledStudent.id,
          lectureId: chapter1Lecture.id,
        },
      },
      create: {
        userId: enrolledStudent.id,
        lectureId: chapter1Lecture.id,
        isCompleted: true,
        watchPercentage: 100,
      },
      update: {
        isCompleted: true,
        watchPercentage: 100,
      },
    });

    // Record a failed attempt for Chapter 1 Quiz (score: 40, passingScore: 60)
    await db.quizAttempt.create({
      data: {
        userId: enrolledStudent.id,
        quizId: chapter1Quiz.id,
        score: 40,
        answers: JSON.stringify({}),
        submittedAt: new Date(),
      },
    });

    // Attempt to access Chapter 2 Quiz
    const req = new NextRequest(`http://localhost/api/student/quiz/${chapter2Quiz.id}`);
    const res = await quizParamHandler(req, { params: Promise.resolve({ id: chapter2Quiz.id }) });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("يجب أولاً اجتياز اختبار الفصل السابق");
    expect(body.code).toBe("PREVIOUS_MANDATORY_QUIZ_NOT_PASSED");
  });

  it("AC1: should return quiz content with HTTP 200 once prerequisite lecture is completed", async () => {
    (globalThis as any).__mockQuizLockToken = enrolledStudentToken;

    // Ensure chapter 1 lecture is completed
    await db.lessonProgress.upsert({
      where: {
        userId_lectureId: {
          userId: enrolledStudent.id,
          lectureId: chapter1Lecture.id,
        },
      },
      create: {
        userId: enrolledStudent.id,
        lectureId: chapter1Lecture.id,
        isCompleted: true,
        watchPercentage: 100,
      },
      update: {
        isCompleted: true,
        watchPercentage: 100,
      },
    });

    const req = new NextRequest(`http://localhost/api/student/quiz/${chapter1Quiz.id}`);
    const res = await quizParamHandler(req, { params: Promise.resolve({ id: chapter1Quiz.id }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(chapter1Quiz.id);
    expect(body.title).toBe(chapter1Quiz.title);
    expect(body.questions).toBeDefined();
    expect(body.questions.length).toBeGreaterThan(0);

    // Verify academic integrity: correctOption and explanation must not be exposed to students
    for (const q of body.questions) {
      expect(q.correctOption).toBeNull();
      expect(q.explanation).toBeNull();
    }
  });

  it("AC1: should unlock Chapter 2 Quiz with HTTP 200 once Chapter 1 Quiz is passed and Chapter 2 Lecture is completed", async () => {
    (globalThis as any).__mockQuizLockToken = enrolledStudentToken;

    // Record a passing attempt for Chapter 1 Quiz (score: 90 >= 60)
    await db.quizAttempt.create({
      data: {
        userId: enrolledStudent.id,
        quizId: chapter1Quiz.id,
        score: 90,
        answers: JSON.stringify({}),
        submittedAt: new Date(),
      },
    });

    // Ensure Chapter 2 lecture is completed
    await db.lessonProgress.upsert({
      where: {
        userId_lectureId: {
          userId: enrolledStudent.id,
          lectureId: chapter2Lecture.id,
        },
      },
      create: {
        userId: enrolledStudent.id,
        lectureId: chapter2Lecture.id,
        isCompleted: true,
        watchPercentage: 100,
      },
      update: {
        isCompleted: true,
        watchPercentage: 100,
      },
    });

    // Student now requests Chapter 2 Quiz
    const req = new NextRequest(`http://localhost/api/student/quiz/${chapter2Quiz.id}`);
    const res = await quizParamHandler(req, { params: Promise.resolve({ id: chapter2Quiz.id }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(chapter2Quiz.id);
    expect(body.title).toBe(chapter2Quiz.title);
    expect(body.questions.length).toBeGreaterThan(0);
  });

  it("should allow Admin/Instructor full access to quiz content bypassing prerequisite completion locks (HTTP 200)", async () => {
    (globalThis as any).__mockQuizLockToken = adminToken;

    // Admin accesses Chapter 2 Quiz even though admin has no lessonProgress or previous quiz attempts
    const req = new NextRequest(`http://localhost/api/student/quiz/${chapter2Quiz.id}`);
    const res = await quizParamHandler(req, { params: Promise.resolve({ id: chapter2Quiz.id }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(chapter2Quiz.id);
    // Admin receives full answers and explanations for quiz review
    expect(body.questions[0].correctOption).toBe(0);
    expect(body.questions[0].explanation).toBeDefined();
  });

  it("should return HTTP 404 when requested quiz does not exist in database", async () => {
    (globalThis as any).__mockQuizLockToken = enrolledStudentToken;

    const req = new NextRequest(`http://localhost/api/student/quiz/non-existent-quiz-id`);
    const res = await quizParamHandler(req, { params: Promise.resolve({ id: "non-existent-quiz-id" }) });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("الاختبار غير موجود");
  });

  it("should validate query-based endpoint (/api/student/quiz?quizId=...) with identical prerequisite enforcement", async () => {
    (globalThis as any).__mockQuizLockToken = unenrolledStudentToken;

    // Unenrolled student hits query-based endpoint
    const queryReq = new NextRequest(`http://localhost/api/student/quiz?quizId=${chapter1Quiz.id}`);
    const res = await quizQueryHandler(queryReq);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("NOT_ENROLLED");
  });
});
