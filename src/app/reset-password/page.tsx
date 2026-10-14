"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, KeyRound, Eye, EyeOff, Loader2, CheckCircle2, XCircle } from "lucide-react";
import AuthBackground from "@/components/AuthBackground";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const qEmail = searchParams.get("email");
    const qOtp = searchParams.get("otp");
    if (qEmail) setEmail(qEmail);
    if (qOtp) setOtp(qOtp);
  }, [searchParams]);

  // Real-time criteria checks (AC5)
  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const isFormValid = hasMinLength && hasNumber && hasSpecialChar && passwordsMatch && otp.trim().length >= 4;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("يرجى إدخال البريد الإلكتروني");
      return;
    }

    if (!otp.trim()) {
      setError("يرجى إدخال كود التحقق المكون من 6 أرقام");
      return;
    }

    if (!hasMinLength) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }

    if (!hasNumber) {
      setError("كلمة المرور يجب أن تحتوي على رقم واحد على الأقل");
      return;
    }

    if (!hasSpecialChar) {
      setError("كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (!@#$%^&*...)");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "حدث خطأ أثناء إعادة تعيين كلمة المرور");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login?resetSuccess=true");
      }, 1500);
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
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">تعيين كلمة المرور الجديدة</h1>
          <p className="text-sm text-physicsNavy-300">
            أدخل كود التحقق المرسل إلى بريدك وكلمة المرور الجديدة
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center py-6 space-y-4">
            <div className="inline-flex p-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h2 className="text-xl font-bold text-white">تم تغيير كلمة السر بنجاح!</h2>
            <p className="text-sm text-physicsNavy-300">
              يمكنك التسجيل الآن، جاري تحويلك لصفحة تسجيل الدخول...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-physicsNavy-200 mb-1.5">
                البريد الإلكتروني
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
                  className="w-full pl-4 pr-10 py-2.5 bg-physicsNavy-950/50 border border-physicsNavy-700 focus:border-physicsCyan-500 rounded-xl text-white placeholder-physicsNavy-500 outline-none text-right transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-physicsNavy-200 mb-1.5">
                كود التحقق (OTP)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-physicsNavy-400 pointer-events-none">
                  <KeyRound className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full pl-4 pr-10 py-2.5 bg-physicsNavy-950/50 border border-physicsNavy-700 focus:border-physicsCyan-500 rounded-xl text-white placeholder-physicsNavy-500 outline-none text-center font-mono tracking-widest text-lg transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-physicsNavy-200 mb-1.5">
                كلمة المرور الجديدة
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-physicsNavy-400 pointer-events-none">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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

            <div>
              <label className="block text-sm font-medium text-physicsNavy-200 mb-1.5">
                تأكيد كلمة المرور الجديدة
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-physicsNavy-400 pointer-events-none">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-10 py-2.5 bg-physicsNavy-950/50 border border-physicsNavy-700 focus:border-physicsCyan-500 rounded-xl text-white placeholder-physicsNavy-500 outline-none text-right transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-physicsNavy-400 hover:text-white"
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Password Criteria Checklist (AC5) */}
            <div className="p-3 bg-physicsNavy-900/60 border border-physicsNavy-800 rounded-xl space-y-1.5 text-xs">
              <div className={`flex items-center gap-2 ${hasMinLength ? "text-emerald-400" : "text-physicsNavy-400"}`}>
                {hasMinLength ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                <span>8 أحرف على الأقل</span>
              </div>
              <div className={`flex items-center gap-2 ${hasNumber ? "text-emerald-400" : "text-physicsNavy-400"}`}>
                {hasNumber ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                <span>رقم واحد على الأقل (0-9)</span>
              </div>
              <div className={`flex items-center gap-2 ${hasSpecialChar ? "text-emerald-400" : "text-physicsNavy-400"}`}>
                {hasSpecialChar ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                <span>رمز خاص واحد على الأقل (!@#$%^&*...)</span>
              </div>
              <div className={`flex items-center gap-2 ${passwordsMatch ? "text-emerald-400" : "text-physicsNavy-400"}`}>
                {passwordsMatch ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                <span>تطابق كلمتي المرور</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="w-full py-3 mt-2 bg-gradient-to-r from-physicsCyan-600 to-physicsCyan-500 hover:from-physicsCyan-500 hover:to-physicsCyan-400 text-white font-semibold rounded-xl transition shadow-lg shadow-physicsCyan-950/50 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري تحديث كلمة المرور...</span>
                </>
              ) : (
                <span>تحديث كلمة المرور</span>
              )}
            </button>

            <div className="pt-2 text-center">
              <Link
                href="/login"
                className="text-sm text-physicsNavy-300 hover:text-physicsCyan-400 transition"
              >
                العودة لصفحة تسجيل الدخول
              </Link>
            </div>
          </form>
        )}
      </div>
    </AuthBackground>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <ResetPasswordContent />
    </React.Suspense>
  );
}
