"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateCourseAction(formData: FormData) {
  await requireAuth("ADMIN");

  const courseId = formData.get("courseId") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const grade = formData.get("grade") as string;
  const image = formData.get("image") as string;

  if (!courseId || !title || !grade) {
    throw new Error("بيانات الكورس غير مكتملة");
  }

  await db.course.update({
    where: { id: courseId },
    data: {
      title,
      description: description || null,
      grade,
      ...(image ? { image } : {}),
    },
  });

  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses?courseId=${courseId}`);
}

export async function deleteCourseAction(formData: FormData) {
  await requireAuth("ADMIN");

  const courseId = formData.get("courseId") as string;
  if (!courseId) {
    throw new Error("معرف الكورس مطلوب");
  }

  await db.course.delete({
    where: { id: courseId },
  });

  revalidatePath("/admin/courses");
  redirect("/admin/courses");
}

export async function deleteChapterAction(formData: FormData) {
  await requireAuth("ADMIN");

  const chapterId = formData.get("chapterId") as string;
  const courseId = formData.get("courseId") as string;

  if (!chapterId) {
    throw new Error("معرف الفصل مطلوب");
  }

  await db.chapter.delete({
    where: { id: chapterId },
  });

  if (courseId) {
    revalidatePath(`/admin/courses?courseId=${courseId}`);
  }
}

export async function deleteLectureAction(formData: FormData) {
  await requireAuth("ADMIN");

  const lectureId = formData.get("lectureId") as string;
  const courseId = formData.get("courseId") as string;

  if (!lectureId) {
    throw new Error("معرف المحاضرة مطلوب");
  }

  await db.lecture.delete({
    where: { id: lectureId },
  });

  if (courseId) {
    revalidatePath(`/admin/courses?courseId=${courseId}`);
  }
}

export async function deleteHomeworkAction(formData: FormData) {
  await requireAuth("ADMIN");

  const homeworkId = formData.get("homeworkId") as string;
  const courseId = formData.get("courseId") as string;

  if (!homeworkId) {
    throw new Error("معرف الواجب مطلوب");
  }

  await db.homework.delete({
    where: { id: homeworkId },
  });

  if (courseId) {
    revalidatePath(`/admin/courses?courseId=${courseId}`);
  }
}

export async function createCourseAction(formData: FormData) {
  await requireAuth("ADMIN");

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const image = formData.get("image") as string;
  const grade = formData.get("grade") as string;

  if (!title || !grade) {
    throw new Error("اسم الكورس والصف الدراسي مطلوبان");
  }

  const course = await db.course.create({
    data: {
      title,
      description: description || null,
      image: image || "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=600&auto=format&fit=crop",
      grade,
      isPublished: true,
    },
  });

  revalidatePath("/admin/courses");
  return { success: true, courseId: course.id };
}

export async function createChapterAction(formData: FormData) {
  await requireAuth("ADMIN");

  const title = formData.get("title") as string;
  const orderStr = formData.get("order") as string;
  const courseId = formData.get("courseId") as string;

  if (!title || !courseId) {
    throw new Error("عنوان الفصل ومعرف الكورس مطلوبان");
  }

  const chapter = await db.chapter.create({
    data: {
      title,
      order: parseInt(orderStr) || 1,
      courseId,
    },
  });

  revalidatePath(`/admin/courses?courseId=${courseId}`);
  return { success: true, chapterId: chapter.id };
}

export async function createLectureAction(formData: FormData) {
  await requireAuth("ADMIN");

  const title = formData.get("title") as string;
  const videoUrl = formData.get("videoUrl") as string;
  const duration = formData.get("duration") as string;
  const orderStr = formData.get("order") as string;
  const chapterId = formData.get("chapterId") as string;
  const courseId = formData.get("courseId") as string;

  if (!title || !videoUrl || !chapterId) {
    throw new Error("عنوان المحاضرة ورابط الفيديو مطلوبان");
  }

  const lecture = await db.lecture.create({
    data: {
      title,
      videoUrl,
      duration: duration || "00:00",
      order: parseInt(orderStr) || 1,
      chapterId,
    },
  });

  if (courseId) {
    revalidatePath(`/admin/courses?courseId=${courseId}`);
  }
  return { success: true, lectureId: lecture.id };
}

export async function createHomeworkAction(formData: FormData) {
  await requireAuth("ADMIN");

  const title = formData.get("title") as string;
  const pdfUrl = formData.get("pdfUrl") as string;
  const chapterId = formData.get("chapterId") as string;
  const courseId = formData.get("courseId") as string;

  if (!title || !pdfUrl || !chapterId) {
    throw new Error("عنوان ملف الواجب ورابط الملف مطلوبان");
  }

  const homework = await db.homework.create({
    data: {
      title,
      pdfUrl,
      chapterId,
    },
  });

  if (courseId) {
    revalidatePath(`/admin/courses?courseId=${courseId}`);
  }
  return { success: true, homeworkId: homework.id };
}

