"use server";

import { db } from "@/lib/db";
import { requireAuth, hashPassword } from "@/lib/auth";
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

export async function createAccountAction(formData: FormData) {
  await requireAuth("ADMIN");

  const name = (formData.get("name") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();
  const password = formData.get("password") as string;
  const role = (formData.get("role") as string) || "STUDENT";
  const grade = (formData.get("grade") as string) || "1";

  if (!name || !phone || !password) {
    throw new Error("جميع البيانات الأساسية (الاسم، رقم الهاتف، كلمة المرور) مطلوبة");
  }

  const existing = await db.user.findUnique({
    where: { phone },
  });

  if (existing) {
    throw new Error("رقم الهاتف مسجل بالفعل مسبقاً في المنصة");
  }

  const hashedPassword = await hashPassword(password);

  await db.user.create({
    data: {
      name,
      phone,
      password: hashedPassword,
      role: role === "ADMIN" ? "ADMIN" : "STUDENT",
      grade: role === "ADMIN" ? "3" : grade,
      isApproved: true, // Created by admin, auto approved
    },
  });

  revalidatePath("/admin/students");
}

