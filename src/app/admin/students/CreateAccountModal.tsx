"use client";

import React, { useState } from "react";
import { UserPlus, X, Loader2, ShieldCheck, GraduationCap } from "lucide-react";
import { createAccountAction } from "./actions";

export default function CreateAccountModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"STUDENT" | "ADMIN">("STUDENT");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData(e.currentTarget);
      await createAccountAction(formData);
      setSuccess(`تم إضافة حساب ${role === "ADMIN" ? "الأدمن" : "الطالب"} بنجاح!`);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء إضافة الحساب");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-physicsCyan-600 hover:bg-physicsCyan-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-sm shadow-physicsCyan-600/20"
      >
        <UserPlus className="w-4 h-4" />
        <span>إضافة حساب جديد (طالب / أدمن)</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md space-y-6 text-right shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-800">إنشاء حساب جديد</h3>
                <p className="text-xs text-slate-400 mt-0.5">إضافة طالب أو مسؤول جديد ببيانات معتمدة مباشرة</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error / Success Messages */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold">
                {success}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role Toggle */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">نوع الحساب</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setRole("STUDENT")}
                    className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                      role === "STUDENT"
                        ? "bg-white text-physicsCyan-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>طالب</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("ADMIN")}
                    className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                      role === "ADMIN"
                        ? "bg-amber-500 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>مسؤول (أدمن)</span>
                  </button>
                </div>
                <input type="hidden" name="role" value={role} />
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">الاسم بالكامل</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder={role === "ADMIN" ? "مثال: أ. محمود الشحات" : "مثال: أحمد محمد علي"}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-physicsCyan-500 transition"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">رقم الهاتف</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="01012345678"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:outline-none focus:border-physicsCyan-500 transition dir-ltr text-right"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">كلمة المرور</label>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-physicsCyan-500 transition"
                />
              </div>

              {/* Grade (Only for Student) */}
              {role === "STUDENT" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">الصف الدراسي</label>
                  <select
                    name="grade"
                    defaultValue="1"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-physicsCyan-500 transition"
                  >
                    <option value="1">الصف الأول الثانوي</option>
                    <option value="2">الصف الثاني الثانوي</option>
                    <option value="3">الصف الثالث الثانوي</option>
                  </select>
                </div>
              )}

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-physicsCyan-600 hover:bg-physicsCyan-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex justify-center items-center gap-2 shadow-md shadow-physicsCyan-600/10"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>حفظ وإنشاء الحساب</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
