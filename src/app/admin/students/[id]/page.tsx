import React from "react";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { generateAllReportsForStudent } from "@/lib/reports";
import StudentProfileClient from "./StudentProfileClient";

interface StudentProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminStudentProfilePage({
  params,
}: StudentProfilePageProps) {
  await requireAuth("ADMIN");

  const resolvedParams = await params;
  const studentId = resolvedParams.id;

  const student = await db.user.findUnique({
    where: { id: studentId },
    include: {
      lessonProgress: true,
      quizAttempts: {
        include: {
          quiz: {
            include: {
              chapter: true,
            },
          },
        },
        orderBy: { startedAt: "desc" },
      },
      weeklyReports: {
        orderBy: { weekNumber: "desc" },
      },
    },
  });

  if (!student) {
    notFound();
  }

  // If student has no weekly reports generated yet, calculate them on the fly
  let reports = student.weeklyReports;
  if (reports.length === 0) {
    reports = await generateAllReportsForStudent(student.id);
  }

  // Fetch all lectures for this student's grade
  const availableLectures = await db.lecture.findMany({
    where: {
      chapter: {
        course: {
          grade: student.grade,
        },
      },
    },
    include: {
      chapter: {
        include: {
          course: true,
        },
      },
    },
    orderBy: [
      { chapter: { order: "asc" } },
      { order: "asc" },
    ],
  });

  // Map lectures with student's watch progress
  const lecturesProgress = availableLectures.map((lecture) => {
    const progress = student.lessonProgress.find((p) => p.lectureId === lecture.id);
    return {
      id: lecture.id,
      title: lecture.title,
      chapterTitle: lecture.chapter.title,
      courseTitle: lecture.chapter.course.title,
      duration: lecture.duration,
      watchedSeconds: progress?.watchedSeconds || 0,
      totalSeconds: progress?.totalSeconds || 0,
      watchPercentage: progress?.watchPercentage || 0,
      isCompleted: progress?.isCompleted || false,
      completedAt: progress?.completedAt || null,
    };
  });

  // Map quiz attempts
  const quizAttempts = student.quizAttempts.map((attempt) => {
    return {
      id: attempt.id,
      quizTitle: attempt.quiz.title,
      chapterTitle: attempt.quiz.chapter.title,
      score: attempt.score,
      passingScore: attempt.quiz.passingScore,
      isPassed: attempt.score >= attempt.quiz.passingScore,
      submittedAt: attempt.submittedAt,
    };
  });

  return (
    <StudentProfileClient
      student={{
        id: student.id,
        name: student.name,
        phone: student.phone,
        parentPhone: student.parentPhone,
        grade: student.grade,
        subscriptionDate: student.subscriptionDate || student.createdAt,
        createdAt: student.createdAt,
        isApproved: student.isApproved,
        isBlocked: student.isBlocked,
      }}
      lecturesProgress={lecturesProgress}
      quizAttempts={quizAttempts}
      weeklyReports={reports}
    />
  );
}
