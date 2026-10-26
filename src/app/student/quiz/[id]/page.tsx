import React from "react";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import QuizClient from "./QuizClient";
import { inspectQuizPrerequisites } from "@/lib/quiz-lock";

interface QuizPageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentQuizPage({ params }: QuizPageProps) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const resolvedParams = await params;
  const quizId = resolvedParams.id;

  // 1. Fetch Quiz with Questions
  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: true,
      chapter: {
        include: {
          course: true,
        },
      },
    },
  });

  if (!quiz) {
    redirect("/student");
  }

  // 2. Server-side validation of mandatory quiz locks and prerequisite completion
  const prereqCheck = await inspectQuizPrerequisites(user.id, quizId, user.role);
  if (!prereqCheck.allowed) {
    if (quiz.chapter?.courseId) {
      redirect(`/student/course/${quiz.chapter.courseId}`);
    }
    redirect("/student");
  }

  // 3. Fetch past attempts for this quiz
  const pastAttempts = await db.quizAttempt.findMany({
    where: {
      userId: user.id,
      quizId: quiz.id,
    },
    orderBy: { submittedAt: "desc" },
  });

  // Security: Do not expose model answers or explanations to students
  const sanitizedQuiz = {
    ...quiz,
    maxAttempts: quiz.maxAttempts ?? 3,
    questions: quiz.questions.map((q) => ({
      ...q,
      correctOption: null,
      explanation: null,
    })),
  };

  return (
    <div className="max-w-4xl mx-auto">
      <QuizClient quiz={sanitizedQuiz} user={user} pastAttempts={pastAttempts} />
    </div>
  );
}
