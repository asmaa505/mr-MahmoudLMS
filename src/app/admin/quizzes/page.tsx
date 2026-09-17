import React from "react";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import QuizManagerClient from "./QuizManagerClient";
import QuizLeaderboard from "./QuizLeaderboard";

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

  // Fetch all quizzes with questions, chapter info, and attempts with user info
  const quizzes = await db.quiz.findMany({
    include: {
      questions: true,
      chapter: {
        include: {
          course: true,
        },
      },
      attempts: {
        include: {
          user: true,
        },
        orderBy: { score: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* Top Performers Diagram & Leaderboard */}
      <QuizLeaderboard quizzes={quizzes} />

      {/* Main Quizzes & Questions Management */}
      <QuizManagerClient chapters={chapters} initialQuizzes={quizzes} />
    </div>
  );
}
