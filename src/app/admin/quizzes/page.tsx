import React from "react";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import QuizManagerClient from "./QuizManagerClient";

export default async function AdminQuizzesPage() {
  const user = await getAuthUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  // Fetch all chapters with course info
  const chapters = await db.chapter.findMany({
    include: {
      course: true,
    },
    orderBy: { order: "asc" },
  });

  // Fetch all quizzes
  const quizzes = await db.quiz.findMany({
    include: {
      questions: true,
      chapter: {
        include: {
          course: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-7xl mx-auto">
      <QuizManagerClient chapters={chapters} initialQuizzes={quizzes} />
    </div>
  );
}
