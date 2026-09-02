"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function UnlockForm() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/student/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل تفعيل الكود");
      }

      setSuccess(data.message);
      setCode("");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="activation-card" className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 transition-all duration-300">
      <div className="flex items-center gap-2 mb-4">
        <KeyRound className="w-5 h-5 text-physicsCyan-600" />
        <h2 className="font-bold text-slate-800 text-base">تفعيل كورس جديد</h2>
      </div>

      <p className="text-slate-500 text-xs mb-5 leading-relaxed">
        إذا قمت بشراء كارت تفعيل من الأستاذ محمود الشحات، أدخل الكود المكون من حروف وأرقام بالأسفل لتفعيل الكورس فوراً.
      </p>

      {error && (
        <div className="mb-5 p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-100">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-5 p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl flex items-center gap-2 border border-emerald-100 animate-pulse">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleUnlock} className="flex flex-col sm:flex-row gap-3 w-full">
        <input
          id="activation-code-input"
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (error) setError("");
            if (success) setSuccess("");
          }}
          placeholder="مثال: PHY-XXXX-YYYY"
          className="flex-1 px-4 py-2.5 border border-slate-200 focus:border-physicsCyan-500 rounded-xl outline-none text-right font-mono placeholder-slate-300 text-slate-700 text-sm transition focus:ring-1 focus:ring-physicsCyan-500"
          required
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="px-5 py-2.5 bg-physicsCyan-600 hover:bg-physicsCyan-500 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2 focus:ring-2 focus:ring-physicsCyan-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:border disabled:border-slate-200 disabled:cursor-not-allowed sm:w-auto w-full shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>تفعيل</span>}
        </button>
      </form>
    </div>
  );
}
