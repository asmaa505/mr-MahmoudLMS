"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, ArrowRight, Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import AuthBackground from "@/components/AuthBackground";

function ForgotPasswordContent() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("يرجى إدخال البريد الإلكتروني");
      return;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError("صيغة البريد الإلكتروني غير صحيحة");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "حدث خطأ ما أثناء إرسال كود التحقق");
      }

      setSuccess(true);
      // Automatically redirect to reset-password after brief notice, or user can click
      setTimeout(() => {
        router.push(`/reset-password?email=${encodeURIComponent(cleanEmail)}`);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground>
      <div className="w-full max-w-md bg-slate-950/70 backdrop-blur-2xl border border-physicsCyan-500/25 rounded-2xl p-8 shadow-2xl relative z-10 shadow-physicsCyan-950/40">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-full bg-physicsCyan-500/10 border border-physicsCyan-500/30 text-physicsCyan-400 mb-4">
            <KeyRound className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">استعادة كلمة المرور</h1>
          <p className="text-sm text-physicsNavy-300">
            أدخل بريدك الإلكتروني المسجل لإرسال كود التحقق (OTP)
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        {success ? (
          <div className="space-y-6 text-center py-4">
            <div className="inline-flex p-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">
                تم إرسال كود التحقق بنجاح!
              </h2>
              <p className="text-sm text-physicsNavy-300 leading-relaxed">
                يرجى تفقد صندوق الوارد في بريدك الإلكتروني{" "}
                <span className="text-physicsCyan-400 font-medium">{email}</span> وإدخال
                كود التحقق المكون من 6 أرقام.
              </p>
            </div>
            <Link
              href={`/reset-password?email=${encodeURIComponent(email.trim())}`}
              className="w-full py-3 bg-gradient-to-r from-physicsCyan-600 to-physicsCyan-500 hover:from-physicsCyan-500 hover:to-physicsCyan-400 text-white font-semibold rounded-xl transition shadow-lg shadow-physicsCyan-950/50 flex items-center justify-center gap-2"
            >
              <span>متابعة إدخال كود التحقق</span>
              <ArrowRight className="w-4 h-4 rotate-180" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-physicsNavy-200 mb-2">
                البريد الإلكتروني المسجل
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-physicsNavy-400 pointer-events-none">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@domain.com"
                  className="w-full pl-4 pr-10 py-3 bg-physicsNavy-950/50 border border-physicsNavy-700 focus:border-physicsCyan-500 rounded-xl text-white placeholder-physicsNavy-500 outline-none text-right transition"
                  required
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-physicsCyan-600 to-physicsCyan-500 hover:from-physicsCyan-500 hover:to-physicsCyan-400 text-white font-semibold rounded-xl transition shadow-lg shadow-physicsCyan-950/50 flex items-center justify-center gap-2 disabled:opacity-55"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري إرسال كود التحقق...</span>
                </>
              ) : (
                <span>إرسال كود التحقق</span>
              )}
            </button>

            <div className="pt-2 text-center">
              <Link
                href="/login"
                className="text-sm text-physicsNavy-300 hover:text-physicsCyan-400 transition inline-flex items-center gap-1.5"
              >
                <span>العودة لصفحة تسجيل الدخول</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </AuthBackground>
  );
}

export default function ForgotPasswordPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <ForgotPasswordContent />
    </React.Suspense>
  );
}
