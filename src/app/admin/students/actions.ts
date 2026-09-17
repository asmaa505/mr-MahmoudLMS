"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function approveStudentAction(formData: FormData) {
  await requireAuth("ADMIN");
  const id = formData.get("studentId") as string;
  if (id) {
    await db.user.update({
      where: { id },
      data: { isApproved: true },
    });
    revalidatePath("/admin/students");
  }
}

export async function blockStudentAction(formData: FormData) {
  await requireAuth("ADMIN");
  const id = formData.get("studentId") as string;
  const isBlocked = formData.get("isBlocked") === "true";
  if (id) {
    await db.user.update({
      where: { id },
      data: { isBlocked: !isBlocked },
    });
    // Invalidate sessions immediately
    if (!isBlocked) {
      await db.session.deleteMany({ where: { userId: id } });
    }
    revalidatePath("/admin/students");
  }
}

export async function resetSessionsAction(formData: FormData) {
  await requireAuth("ADMIN");
  const id = formData.get("studentId") as string;
  if (id) {
    await db.session.deleteMany({
      where: { userId: id },
    });
    revalidatePath("/admin/students");
  }
}

export async function deleteStudentAction(formData: FormData) {
  await requireAuth("ADMIN");
  const id = formData.get("studentId") as string;
  if (id) {
    await db.user.delete({
      where: { id },
    });
    revalidatePath("/admin/students");
  }
}
