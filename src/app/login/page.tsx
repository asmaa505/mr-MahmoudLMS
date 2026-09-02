"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BookOpen, Phone, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import AuthBackground from "@/components/AuthBackground";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "حدث خطأ ما");
      }

      // Route based on role
      if (data.user.role === "ADMIN") {
        router.push("/admin");
      } else if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.push("/student");
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground>
      <div className="w-full max-w-md bg-slate-950/70 backdrop-blur-2xl border border-physicsCyan-500/25 rounded-2xl p-8 shadow-2xl relative z-10 shadow-physicsCyan-950/40">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-full bg-physicsCyan-500/10 border border-physicsCyan-500/30 text-physicsCyan-400 mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">تسجيل الدخول</h1>
          <p className="text-sm text-physicsNavy-300">منصة الفيزياء للأستاذ محمود الشحات</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-physicsNavy-200 mb-2">رقم الهاتف</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-physicsNavy-400 pointer-events-none">
                <Phone className="w-5 h-5" />
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                className="w-full pl-4 pr-10 py-3 bg-physicsNavy-950/50 border border-physicsNavy-700 focus:border-physicsCyan-500 rounded-xl text-white placeholder-physicsNavy-500 outline-none text-right transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-physicsNavy-200 mb-2">كلمة المرور</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-physicsNavy-400 pointer-events-none">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-10 py-3 bg-physicsNavy-950/50 border border-physicsNavy-700 focus:border-physicsCyan-500 rounded-xl text-white placeholder-physicsNavy-500 outline-none text-right transition"
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
            className="w-full py-3 bg-gradient-to-r from-physicsCyan-600 to-physicsCyan-500 hover:from-physicsCyan-500 hover:to-physicsCyan-400 text-white font-semibold rounded-xl transition shadow-lg shadow-physicsCyan-950/50 flex items-center justify-center gap-2 disabled:opacity-55"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري تسجيل الدخول...</span>
              </>
            ) : (
              <span>دخول</span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-physicsNavy-300">
          <span>ليس لديك حساب؟ </span>
          <Link
            href={`/register${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`}
            className="text-physicsCyan-400 hover:underline"
          >
            أنشئ حساباً جديداً
          </Link>
        </div>
      </div>
    </AuthBackground>
  );
}
