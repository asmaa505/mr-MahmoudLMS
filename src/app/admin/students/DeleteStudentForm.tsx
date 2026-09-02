"use client";

import React from "react";
import { X } from "lucide-react";
import { deleteStudentAction } from "./actions";

interface DeleteStudentFormProps {
  studentId: string;
}

export default function DeleteStudentForm({ studentId }: DeleteStudentFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm("هل أنت متأكد من رفض وحذف الطالب نهائياً؟")) {
      e.preventDefault();
    }
  };

  return (
    <form action={deleteStudentAction} onSubmit={handleSubmit}>
      <input type="hidden" name="studentId" value={studentId} />
      <button
        type="submit"
        title="رفض وحذف الحساب"
        className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-650 hover:bg-red-500 hover:text-white font-bold text-[10px] transition flex items-center gap-1"
      >
        <X className="w-3.5 h-3.5" />
        <span>رفض</span>
      </button>
    </form>
  );
}
