import React from "react";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import QuizClient from "./QuizClient";

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

  // 2. Check if student is enrolled in the course this quiz belongs to
  const enrollment = await db.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: user.id,
        courseId: quiz.chapter.courseId,
      },
    },
  });

  if (!enrollment) {
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

  // Security: Do not expose correct answers or explanations to active test takers
  const sanitizedQuiz = {
    ...quiz,
    questions: pastAttempts.length > 0
      ? quiz.questions
      : quiz.questions.map((q) => ({
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
