"use client";

import React, { useState } from "react";
import { Edit3, Trash2, X, AlertTriangle, Loader2 } from "lucide-react";
import { updateCourseAction, deleteCourseAction, deleteChapterAction, deleteLectureAction, deleteHomeworkAction } from "./actions";
import MediaUploadInput from "@/components/MediaUploadInput";

interface CourseHeaderActionsProps {
  course: {
    id: string;
    title: string;
    description: string | null;
    grade: string;
    image: string | null;
  };
}

export default function CourseHeaderActions({ course }: CourseHeaderActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUpdateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const formData = new FormData(e.currentTarget);
      await updateCourseAction(formData);
      setIsEditOpen(false);
    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء تعديل الكورس");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الكورس "${course.title}" نهائياً؟\nسيتم حذف كافة الفصول والمحاضرات والواجبات والاختبارات المرتبطة به ولا يمكن التراجع عن هذا الإجراء.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const formData = new FormData();
      formData.append("courseId", course.id);
      await deleteCourseAction(formData);
    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء حذف الكورس");
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Top Action Buttons in Header */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsEditOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition border border-white/10 backdrop-blur-sm"
        >
          <Edit3 className="w-3.5 h-3.5 text-physicsCyan-400" />
          <span>تعديل الكورس</span>
        </button>

        <form onSubmit={handleDeleteSubmit}>
          <button
            type="submit"
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-xs font-bold transition border border-rose-500/30 disabled:opacity-50"
          >
            {isDeleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
            ) : (
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span>حذف الكورس</span>
          </button>
        </form>
      </div>

      {/* Edit Course Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden text-right">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-physicsCyan-600" />
                <span>تعديل بيانات الكورس</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-200/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4 text-xs">
              <input type="hidden" name="courseId" value={course.id} />

              <div>
                <label className="block font-semibold text-slate-700 mb-1">عنوان الكورس</label>
                <input
                  type="text"
                  name="title"
                  defaultValue={course.title}
                  className="w-full px-3 py-2 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none text-right"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">وصف مختصر</label>
                <textarea
                  name="description"
                  defaultValue={course.description || ""}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none text-right"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">الصف الدراسي</label>
                <select
                  name="grade"
                  defaultValue={course.grade}
                  className="w-full px-3 py-2 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none cursor-pointer"
                  required
                >
                  <option value="1">الأول الثانوي</option>
                  <option value="2">الثاني الثانوي</option>
                  <option value="3">الثالث الثانوي</option>
                </select>
              </div>

              <MediaUploadInput
                name="image"
                mediaType="image"
                label="صورة غلاف الكورس"
                defaultValue={course.image || ""}
                placeholder="أدخل رابط الصورة أو ارفع صورة جديدة من جهازك"
              />

              <div className="flex gap-2 pt-3 border-t border-slate-100 justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 bg-physicsCyan-600 hover:bg-physicsCyan-500 text-white font-bold rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function DeleteChapterButton({ chapterId, courseId }: { chapterId: string; courseId: string }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm("هل أنت متأكد من حذف هذا الفصل بكافة محتوياته؟")) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("chapterId", chapterId);
      formData.append("courseId", courseId);
      await deleteChapterAction(formData);
    } catch (err: any) {
      alert(err.message || "فشل حذف الفصل");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleDelete}>
      <button
        type="submit"
        disabled={loading}
        className="text-slate-400 hover:text-rose-500 transition p-1 rounded hover:bg-rose-50"
        title="حذف الفصل"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" /> : <Trash2 className="w-3.5 h-3.5" />}
      </button>
    </form>
  );
}

export function DeleteLectureButton({ lectureId, courseId }: { lectureId: string; courseId: string }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm("هل أنت متأكد من حذف هذه المحاضرة؟")) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("lectureId", lectureId);
      formData.append("courseId", courseId);
      await deleteLectureAction(formData);
    } catch (err: any) {
      alert(err.message || "فشل حذف المحاضرة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleDelete}>
      <button
        type="submit"
        disabled={loading}
        className="text-slate-400 hover:text-rose-500 transition p-0.5 rounded hover:bg-rose-50"
        title="حذف المحاضرة"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin text-rose-500" /> : <Trash2 className="w-3 h-3" />}
      </button>
    </form>
  );
}

export function DeleteHomeworkButton({ homeworkId, courseId }: { homeworkId: string; courseId: string }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm("هل أنت متأكد من حذف هذا الملف؟")) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("homeworkId", homeworkId);
      formData.append("courseId", courseId);
      await deleteHomeworkAction(formData);
    } catch (err: any) {
      alert(err.message || "فشل حذف الملف");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleDelete}>
      <button
        type="submit"
        disabled={loading}
        className="text-slate-400 hover:text-rose-500 transition p-0.5 rounded hover:bg-rose-50"
        title="حذف الملف"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin text-rose-500" /> : <Trash2 className="w-3 h-3" />}
      </button>
    </form>
  );
}
