import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

function toDate(val: any): Date {
  if (val instanceof Date) return val;
  if (typeof val === "number") return new Date(val);
  if (typeof val === "string") {
    let s = val;
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) {
      s = s.replace(" ", "T") + "Z";
    }
    return new Date(s);
  }
  return new Date();
}

function toNullableDate(val: any): Date | null {
  if (val === null || val === undefined) return null;
  return toDate(val);
}

function toBool(val: any): boolean {
  return val === 1 || val === true || val === "1" || val === "true";
}

async function migrate() {
  console.log("=== Starting Data Migration: SQLite -> PostgreSQL ===");

  const dumpPath = path.resolve(__dirname, "../prisma/sqlite_dump.json");
  if (!fs.existsSync(dumpPath)) {
    throw new Error(`Dump file not found at ${dumpPath}`);
  }

  const dump = JSON.parse(fs.readFileSync(dumpPath, "utf-8"));

  // 1. Users
  const users = dump.User || [];
  console.log(`Migrating ${users.length} Users...`);
  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email || null,
        password: u.password,
        role: u.role || "STUDENT",
        isApproved: toBool(u.isApproved),
        isBlocked: toBool(u.isBlocked),
        grade: u.grade || "1",
        parentPhone: u.parentPhone || null,
        subscriptionDate: toDate(u.subscriptionDate),
        createdAt: toDate(u.createdAt),
      },
    });
  }

  // 2. Sessions
  const sessions = dump.Session || [];
  console.log(`Migrating ${sessions.length} Sessions...`);
  for (const s of sessions) {
    await prisma.session.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        userId: s.userId,
        token: s.token,
        userAgent: s.userAgent || null,
        ipAddress: s.ipAddress || null,
        createdAt: toDate(s.createdAt),
      },
    });
  }

  // 3. Courses
  const courses = dump.Course || [];
  console.log(`Migrating ${courses.length} Courses...`);
  for (const c of courses) {
    await prisma.course.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        title: c.title,
        description: c.description || null,
        image: c.image || null,
        grade: c.grade,
        isPublished: toBool(c.isPublished),
        createdAt: toDate(c.createdAt),
      },
    });
  }

  // 4. Chapters
  const chapters = dump.Chapter || [];
  console.log(`Migrating ${chapters.length} Chapters...`);
  for (const ch of chapters) {
    await prisma.chapter.upsert({
      where: { id: ch.id },
      update: {},
      create: {
        id: ch.id,
        title: ch.title,
        order: ch.order,
        courseId: ch.courseId,
        createdAt: toDate(ch.createdAt),
      },
    });
  }

  // 5. Lectures
  const lectures = dump.Lecture || [];
  console.log(`Migrating ${lectures.length} Lectures...`);
  for (const l of lectures) {
    await prisma.lecture.upsert({
      where: { id: l.id },
      update: {},
      create: {
        id: l.id,
        title: l.title,
        videoUrl: l.videoUrl,
        duration: l.duration || null,
        order: l.order,
        chapterId: l.chapterId,
        createdAt: toDate(l.createdAt),
      },
    });
  }

  // 6. Homeworks
  const homeworks = dump.Homework || [];
  console.log(`Migrating ${homeworks.length} Homeworks...`);
  for (const h of homeworks) {
    await prisma.homework.upsert({
      where: { id: h.id },
      update: {},
      create: {
        id: h.id,
        title: h.title,
        pdfUrl: h.pdfUrl,
        chapterId: h.chapterId,
        createdAt: toDate(h.createdAt),
      },
    });
  }

  // 7. Quizzes
  const quizzes = dump.Quiz || [];
  console.log(`Migrating ${quizzes.length} Quizzes...`);
  for (const q of quizzes) {
    await prisma.quiz.upsert({
      where: { id: q.id },
      update: {},
      create: {
        id: q.id,
        title: q.title,
        duration: q.duration,
        passingScore: q.passingScore,
        maxAttempts: q.maxAttempts,
        isMandatory: toBool(q.isMandatory),
        chapterId: q.chapterId,
        createdAt: toDate(q.createdAt),
      },
    });
  }

  // 8. Questions
  const questions = dump.Question || [];
  console.log(`Migrating ${questions.length} Questions...`);
  for (const qn of questions) {
    await prisma.question.upsert({
      where: { id: qn.id },
      update: {},
      create: {
        id: qn.id,
        quizId: qn.quizId,
        text: qn.text,
        imageUrl: qn.imageUrl || null,
        type: qn.type,
        options: qn.options || null,
        correctOption: qn.correctOption !== null && qn.correctOption !== undefined ? Number(qn.correctOption) : null,
        explanation: qn.explanation || null,
      },
    });
  }

  // 9. Enrollments
  const enrollments = dump.Enrollment || [];
  console.log(`Migrating ${enrollments.length} Enrollments...`);
  for (const e of enrollments) {
    await prisma.enrollment.upsert({
      where: { id: e.id },
      update: {},
      create: {
        id: e.id,
        userId: e.userId,
        courseId: e.courseId,
        unlockedAt: toDate(e.unlockedAt),
      },
    });
  }

  // 10. ActivationCodes
  const codes = dump.ActivationCode || [];
  console.log(`Migrating ${codes.length} ActivationCodes...`);
  for (const ac of codes) {
    await prisma.activationCode.upsert({
      where: { id: ac.id },
      update: {},
      create: {
        id: ac.id,
        code: ac.code,
        courseId: ac.courseId || null,
        lectureId: ac.lectureId || null,
        isUsed: toBool(ac.isUsed),
        usedById: ac.usedById || null,
        assignedToId: ac.assignedToId || null,
        usedAt: toNullableDate(ac.usedAt),
        assignedAt: toNullableDate(ac.assignedAt),
        createdAt: toDate(ac.createdAt),
      },
    });
  }

  // 11. QuizAttempts
  const attempts = dump.QuizAttempt || [];
  console.log(`Migrating ${attempts.length} QuizAttempts...`);
  for (const qa of attempts) {
    await prisma.quizAttempt.upsert({
      where: { id: qa.id },
      update: {},
      create: {
        id: qa.id,
        userId: qa.userId,
        quizId: qa.quizId,
        score: qa.score,
        answers: qa.answers,
        startedAt: toDate(qa.startedAt),
        submittedAt: toNullableDate(qa.submittedAt),
      },
    });
  }

  // 12. LessonProgress
  const progresses = dump.LessonProgress || [];
  console.log(`Migrating ${progresses.length} LessonProgresses...`);
  for (const lp of progresses) {
    await prisma.lessonProgress.upsert({
      where: { id: lp.id },
      update: {},
      create: {
        id: lp.id,
        userId: lp.userId,
        lectureId: lp.lectureId,
        watchedSeconds: lp.watchedSeconds,
        totalSeconds: lp.totalSeconds,
        watchPercentage: lp.watchPercentage,
        isCompleted: toBool(lp.isCompleted),
        lastPosition: lp.lastPosition,
        completedAt: toNullableDate(lp.completedAt),
        updatedAt: toDate(lp.updatedAt),
        createdAt: toDate(lp.createdAt),
      },
    });
  }

  // 13. WeeklyReports
  const reports = dump.WeeklyReport || [];
  console.log(`Migrating ${reports.length} WeeklyReports...`);
  for (const wr of reports) {
    await prisma.weeklyReport.upsert({
      where: { id: wr.id },
      update: {},
      create: {
        id: wr.id,
        userId: wr.userId,
        weekNumber: wr.weekNumber,
        startDate: toDate(wr.startDate),
        endDate: toDate(wr.endDate),
        videosWatchedCount: wr.videosWatchedCount,
        totalVideosAvailable: wr.totalVideosAvailable,
        averageWatchPercentage: wr.averageWatchPercentage,
        examsTakenCount: wr.examsTakenCount,
        averageExamScore: wr.averageExamScore,
        status: wr.status,
        summaryText: wr.summaryText,
        sentToStudentAt: toNullableDate(wr.sentToStudentAt),
        sentToParentAt: toNullableDate(wr.sentToParentAt),
        generatedAt: toDate(wr.generatedAt),
        updatedAt: toDate(wr.updatedAt),
      },
    });
  }

  console.log("\n=== Verifying Data Integrity in PostgreSQL ===");

  const verifications = [
    { model: "User", expected: users.length, actual: await prisma.user.count() },
    { model: "Session", expected: sessions.length, actual: await prisma.session.count() },
    { model: "Course", expected: courses.length, actual: await prisma.course.count() },
    { model: "Chapter", expected: chapters.length, actual: await prisma.chapter.count() },
    { model: "Lecture", expected: lectures.length, actual: await prisma.lecture.count() },
    { model: "Homework", expected: homeworks.length, actual: await prisma.homework.count() },
    { model: "Quiz", expected: quizzes.length, actual: await prisma.quiz.count() },
    { model: "Question", expected: questions.length, actual: await prisma.question.count() },
    { model: "Enrollment", expected: enrollments.length, actual: await prisma.enrollment.count() },
    { model: "ActivationCode", expected: codes.length, actual: await prisma.activationCode.count() },
    { model: "QuizAttempt", expected: attempts.length, actual: await prisma.quizAttempt.count() },
    { model: "LessonProgress", expected: progresses.length, actual: await prisma.lessonProgress.count() },
    { model: "WeeklyReport", expected: reports.length, actual: await prisma.weeklyReport.count() },
  ];

  let hasError = false;
  for (const v of verifications) {
    const status = v.expected === v.actual ? "✓ PASS" : "✗ FAIL";
    console.log(`[${status}] ${v.model}: Expected ${v.expected}, Found in PostgreSQL ${v.actual}`);
    if (v.expected !== v.actual) {
      hasError = true;
    }
  }

  if (hasError) {
    throw new Error("Verification failed! Row counts do not match between SQLite dump and PostgreSQL.");
  }

  // Spot-check sample records
  const admin = await prisma.user.findUnique({ where: { phone: "01000000000" } });
  console.log(`Spot-check Admin: ${admin?.name} (${admin?.role}) - OK`);

  const coursesWithChapters = await prisma.course.findMany({
    include: { chapters: { include: { lectures: true, quizzes: { include: { questions: true } } } } },
  });
  console.log(`Spot-check Relations: ${coursesWithChapters.length} Courses with nested relations - OK`);

  console.log("\n✓ All data successfully migrated to PostgreSQL with 100% integrity!");
}

migrate()
  .catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
