import React from "react";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import ReportsClient from "./ReportsClient";

export default async function AdminReportsPage() {
  await requireAuth("ADMIN");

  const students = await db.user.findMany({
    where: {
      role: "STUDENT",
    },
    include: {
      weeklyReports: {
        orderBy: { weekNumber: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();

  const studentsData = students.map((s) => {
    const subscriptionStart = s.subscriptionDate || s.createdAt;
    const msElapsed = Math.max(0, now.getTime() - subscriptionStart.getTime());
    const daysElapsed = Math.floor(msElapsed / (1000 * 60 * 60 * 24));
    const currentWeekNumber = Math.max(1, Math.floor(daysElapsed / 7) + 1);

    const latestReport = s.weeklyReports[0] || null;

    return {
      id: s.id,
      name: s.name,
      phone: s.phone,
      parentPhone: s.parentPhone,
      grade: s.grade,
      subscriptionDate: subscriptionStart,
      currentWeekNumber,
      latestReport,
    };
  });

  return <ReportsClient studentsData={studentsData} />;
}
