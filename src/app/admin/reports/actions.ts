"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  generateAllStudentsWeeklyReports,
  generateAllReportsForStudent,
} from "@/lib/reports";
import { revalidatePath } from "next/cache";

export async function generateAllReportsAction() {
  await requireAuth("ADMIN");
  await generateAllStudentsWeeklyReports();
  revalidatePath("/admin/reports");
}

export async function generateSingleStudentReportsAction(studentId: string) {
  await requireAuth("ADMIN");
  if (!studentId) return;
  await generateAllReportsForStudent(studentId);
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin/reports");
}

export async function markReportSentAction(formData: FormData) {
  await requireAuth("ADMIN");
  const reportId = formData.get("reportId") as string;
  const target = formData.get("target") as "STUDENT" | "PARENT";

  if (!reportId) return;

  const existing = await db.weeklyReport.findUnique({
    where: { id: reportId },
  });

  if (!existing) return;

  let newStatus = existing.status;
  let sentToStudentAt = existing.sentToStudentAt;
  let sentToParentAt = existing.sentToParentAt;

  if (target === "STUDENT") {
    sentToStudentAt = new Date();
    newStatus = existing.sentToParentAt ? "SENT_BOTH" : "SENT_STUDENT";
  } else if (target === "PARENT") {
    sentToParentAt = new Date();
    newStatus = existing.sentToStudentAt ? "SENT_BOTH" : "SENT_PARENT";
  }

  await db.weeklyReport.update({
    where: { id: reportId },
    data: {
      status: newStatus,
      sentToStudentAt,
      sentToParentAt,
    },
  });

  revalidatePath("/admin/reports");
  revalidatePath(`/admin/students/${existing.userId}`);
}
