"use client";

import React, { useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import MediaUploadInput from "@/components/MediaUploadInput";
import {
  createCourseAction,
  createChapterAction,
  createLectureAction,
  createHomeworkAction,
} from "./actions";

export function CreateCourseForm() {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData(e.currentTarget);
      await createCourseAction(formData);
      // Reset form and media state
      formRef.current?.reset();
      setImageUrl("");
    } catch (err: any) {
      setErrorMessage(err.message || "حدث خطأ أثناء إنشاء الكورس");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3 text-xs">
      {errorMessage && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
          {errorMessage}
        </div>
      )}

      <div>
        <label className="block font-semibold text-slate-650 mb-1">اسم الكورس</label>
        <input
          type="text"
          name="title"
          placeholder="مثال: التيار المتردد والفيزياء الحديثة"
          className="w-full px-3 py-2 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none text-right"
          required
        />
      </div>

      <div>
        <label className="block font-semibold text-slate-650 mb-1">وصف تفصيلي</label>
        <textarea
          name="description"
          placeholder="اكتب وصفاً موجزاً لمحتويات هذا الكورس الدراسي..."
          rows={2}
          className="w-full px-3 py-2 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none text-right"
        />
      </div>

      <div>
        <label className="block font-semibold text-slate-650 mb-1 text-xs">الصف الدراسي</label>
        <select
          name="grade"
          defaultValue="1"
          className="w-full px-3 py-2 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none cursor-pointer text-xs"
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
        value={imageUrl}
        onChange={setImageUrl}
        placeholder="أدخل رابط الصورة أو ارفعها من جهازك (اختياري)"
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 bg-physicsCyan-600 hover:bg-physicsCyan-500 text-white font-bold rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>جاري إنشاء الكورس...</span>
          </>
        ) : (
          <span>إنشاء الكورس</span>
        )}
      </button>
    </form>
  );
}

export function AddChapterForm({
  courseId,
  defaultOrder,
}: {
  courseId: string;
  defaultOrder: number;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData(e.currentTarget);
      await createChapterAction(formData);
      formRef.current?.reset();
    } catch (err: any) {
      setErrorMessage(err.message || "حدث خطأ أثناء إضافة الفصل");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      {errorMessage && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
          {errorMessage}
        </div>
      )}
      <form ref={formRef} onSubmit={handleSubmit} className="flex gap-3 text-xs">
        <input type="hidden" name="courseId" value={courseId} />
        <div className="flex-1">
          <input
            type="text"
            name="title"
            placeholder="عنوان الفصل (مثال: الفصل الثاني: التأثير المغناطيسي للتيار)"
            className="w-full px-3 py-2.5 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none text-right"
            required
          />
        </div>
        <div className="w-20">
          <input
            type="number"
            name="order"
            placeholder="الترتيب"
            defaultValue={defaultOrder}
            className="w-full px-3 py-2.5 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none text-center"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2.5 bg-physicsCyan-600 hover:bg-physicsCyan-500 text-white font-bold rounded-lg transition shrink-0 flex items-center gap-1.5 disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <span>إضافة فصل</span>
          )}
        </button>
      </form>
    </div>
  );
}

export function AddLectureForm({
  courseId,
  chapterId,
  defaultOrder,
}: {
  courseId: string;
  chapterId: string;
  defaultOrder: number;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData(e.currentTarget);
      await createLectureAction(formData);
      // Immediately reset form inputs and clear video url and preview player
      formRef.current?.reset();
      setVideoUrl("");
    } catch (err: any) {
      setErrorMessage(err.message || "حدث خطأ أثناء إضافة المحاضرة");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
      <h5 className="font-bold text-slate-800 text-[11px]">إضافة محاضرة مرئية</h5>
      {errorMessage && (
        <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs">
          {errorMessage}
        </div>
      )}
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-2">
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="chapterId" value={chapterId} />
        <input
          type="text"
          name="title"
          placeholder="عنوان المحاضرة"
          className="w-full px-2 py-1.5 border border-slate-200 focus:border-physicsCyan-500 rounded outline-none text-right"
          required
        />
        <MediaUploadInput
          name="videoUrl"
          mediaType="video"
          value={videoUrl}
          onChange={setVideoUrl}
          placeholder="رابط YouTube/Vimeo أو ارفع فيديو من جهازك"
          required
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            name="duration"
            placeholder="المدة (مثال: 45:00)"
            className="w-full px-2 py-1.5 border border-slate-200 focus:border-physicsCyan-500 rounded outline-none text-center"
          />
          <input
            type="number"
            name="order"
            placeholder="الترتيب"
            defaultValue={defaultOrder}
            className="w-full px-2 py-1.5 border border-slate-200 focus:border-physicsCyan-500 rounded outline-none text-center"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-1.5 bg-physicsNavy-700 hover:bg-physicsNavy-800 text-white font-bold rounded transition text-[10px] flex items-center justify-center gap-1.5 disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>جاري الإضافة...</span>
            </>
          ) : (
            <span>إضافة المحاضرة</span>
          )}
        </button>
      </form>
    </div>
  );
}

export function AddHomeworkForm({
  courseId,
  chapterId,
}: {
  courseId: string;
  chapterId: string;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData(e.currentTarget);
      await createHomeworkAction(formData);
      // Immediately reset form inputs and clear pdf url and file badge
      formRef.current?.reset();
      setPdfUrl("");
    } catch (err: any) {
      setErrorMessage(err.message || "حدث خطأ أثناء إضافة الملف");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
      <h5 className="font-bold text-slate-800 text-[11px]">إضافة ملف ملخص / واجب PDF</h5>
      {errorMessage && (
        <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs">
          {errorMessage}
        </div>
      )}
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-2">
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="chapterId" value={chapterId} />
        <input
          type="text"
          name="title"
          placeholder="عنوان ملف الواجب"
          className="w-full px-2 py-1.5 border border-slate-200 focus:border-physicsCyan-500 rounded outline-none text-right"
          required
        />
        <MediaUploadInput
          name="pdfUrl"
          mediaType="document"
          value={pdfUrl}
          onChange={setPdfUrl}
          placeholder="رابط تحميل ملف الـ PDF أو ارفع ملف من جهازك"
          required
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-1.5 bg-physicsNavy-700 hover:bg-physicsNavy-800 text-white font-bold rounded transition text-[10px] flex items-center justify-center gap-1.5 disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>جاري الإضافة...</span>
            </>
          ) : (
            <span>إضافة الملف</span>
          )}
        </button>
      </form>
    </div>
  );
}
