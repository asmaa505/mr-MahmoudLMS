"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BookOpen, User, Phone, Lock, Eye, EyeOff, GraduationCap, Loader2, CheckCircle2 } from "lucide-react";
import AuthBackground from "@/components/AuthBackground";

function RegisterContent() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [grade, setGrade] = useState("3"); // Default to 3rd secondary
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, password, grade }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "حدث خطأ ما");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground>
      <div className="w-full max-w-md bg-slate-950/70 backdrop-blur-2xl border border-physicsCyan-500/25 rounded-2xl p-8 shadow-2xl relative z-10 shadow-physicsCyan-950/40">
        {success ? (
          <div className="text-center py-8">
            <div className="inline-flex p-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-6 animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">تم تسجيل طلبك بنجاح!</h1>
            <p className="text-physicsNavy-200 text-sm leading-relaxed mb-8">
              حسابك الآن قيد الانتظار للمراجعة والموافقة من قبل الأستاذ محمود الشحات. يرجى التواصل مع الأستاذ لتفعيل حسابك والبدء بالدراسة.
            </p>
            <Link
              href={`/login${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`}
              className="inline-block w-full py-3 bg-gradient-to-r from-physicsCyan-600 to-physicsCyan-500 hover:from-physicsCyan-500 hover:to-physicsCyan-400 text-white font-semibold rounded-xl text-center transition"
            >
              الانتقال لصفحة الدخول
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex p-3 rounded-full bg-physicsCyan-500/10 border border-physicsCyan-500/30 text-physicsCyan-400 mb-4">
                <BookOpen className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">إنشاء حساب جديد</h1>
              <p className="text-sm text-physicsNavy-300">انضم لمنصة الفيزياء للأستاذ محمود الشحات</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-200 text-sm text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-physicsNavy-200 mb-1.5">الاسم الثنائي أو الثلاثي</label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-physicsNavy-400 pointer-events-none">
                    <User className="w-5 h-5" />
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: أحمد محمد علي"
                    className="w-full pl-4 pr-10 py-2.5 bg-physicsNavy-950/50 border border-physicsNavy-700 focus:border-physicsCyan-500 rounded-xl text-white placeholder-physicsNavy-500 outline-none text-right transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-physicsNavy-200 mb-1.5">رقم الهاتف (للتواصل والمطابقة)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-physicsNavy-400 pointer-events-none">
                    <Phone className="w-5 h-5" />
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    className="w-full pl-4 pr-10 py-2.5 bg-physicsNavy-950/50 border border-physicsNavy-700 focus:border-physicsCyan-500 rounded-xl text-white placeholder-physicsNavy-500 outline-none text-right transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-physicsNavy-200 mb-1.5">الصف الدراسي</label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-physicsNavy-400 pointer-events-none">
                    <GraduationCap className="w-5 h-5" />
                  </span>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 bg-physicsNavy-950/50 border border-physicsNavy-700 focus:border-physicsCyan-500 rounded-xl text-white outline-none text-right transition appearance-none cursor-pointer"
                    required
                  >
                    <option className="bg-physicsNavy-900 text-white" value="1">الصف الأول الثانوي</option>
                    <option className="bg-physicsNavy-900 text-white" value="2">الصف الثاني الثانوي</option>
                    <option className="bg-physicsNavy-900 text-white" value="3">الصف الثالث الثانوي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-physicsNavy-200 mb-1.5">كلمة المرور</label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-physicsNavy-400 pointer-events-none">
                    <Lock className="w-5 h-5" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-10 py-2.5 bg-physicsNavy-950/50 border border-physicsNavy-700 focus:border-physicsCyan-500 rounded-xl text-white placeholder-physicsNavy-500 outline-none text-right transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 left-0 pl-3 flex items-center text-physicsNavy-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-4 bg-gradient-to-r from-physicsCyan-600 to-physicsCyan-500 hover:from-physicsCyan-500 hover:to-physicsCyan-400 text-white font-semibold rounded-xl transition shadow-lg shadow-physicsCyan-950/50 flex items-center justify-center gap-2 disabled:opacity-55"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>جاري التسجيل...</span>
                  </>
                ) : (
                  <span>إنشاء الحساب</span>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-physicsNavy-300">
              <span>لديك حساب بالفعل؟ </span>
              <Link
                href={`/login${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`}
                className="text-physicsCyan-400 hover:underline"
              >
                تسجيل الدخول
              </Link>
            </div>
          </>
        )}
      </div>
    </AuthBackground>
  );
}

export default function RegisterPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <RegisterContent />
    </React.Suspense>
  );
}
