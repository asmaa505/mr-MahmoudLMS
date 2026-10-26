"use client";

import React, { useState } from "react";
import { Mail, CheckCircle2, AlertTriangle, Loader2, Send } from "lucide-react";

export default function AdminEmailTestClient() {
  const [testing, setTesting] = useState(false);
  const [sendingTestMail, setSendingTestMail] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [statusResult, setStatusResult] = useState<{
    type: "success" | "error";
    message: string;
    code?: string;
    details?: string;
  } | null>(null);

  const handleVerifyConfig = async () => {
    setTesting(true);
    setStatusResult(null);

    try {
      const res = await fetch("/api/admin/email/test", {
        method: "GET",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatusResult({
          type: "error",
          message: data.error || "فشل الاتصال بخادم البريد الإلكتروني.",
          code: data.code,
          details: data.details,
        });
      } else {
        setStatusResult({
          type: "success",
          message: data.message || "تم التحقق من إعدادات البريد (SMTP) بنجاح.",
        });
      }
    } catch (err: any) {
      setStatusResult({
        type: "error",
        message: err.message || "حدث خطأ غير متوقع أثناء الاتصال بالخادم.",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail.trim()) return;

    setSendingTestMail(true);
    setStatusResult(null);

    try {
      const res = await fetch("/api/admin/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail: testEmail.trim() }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatusResult({
          type: "error",
          message: data.error || "فشل إرسال بريد الاختبار.",
          code: data.code,
          details: data.details,
        });
      } else {
        setStatusResult({
          type: "success",
          message: data.message || `تم إرسال بريد الاختبار بنجاح إلى ${testEmail.trim()}`,
        });
      }
    } catch (err: any) {
      setStatusResult({
        type: "error",
        message: err.message || "حدث خطأ غير متوقع أثناء إرسال البريد.",
      });
    } finally {
      setSendingTestMail(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm text-right space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Mail className="w-5 h-5 text-physicsCyan-600" />
          <span>خدمة البريد الإلكتروني (SMTP)</span>
        </h2>
        <span className="text-[11px] font-semibold text-slate-400">إدارة الإعدادات</span>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        تحقق من صحة إعدادات خادم البريد (SMTP) لتأكيد وصول أكواد استعادة كلمة المرور والإشعارات.
      </p>

      {statusResult && (
        <div
          className={`p-3.5 rounded-xl text-xs space-y-1.5 transition ${
            statusResult.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-start gap-2">
            {statusResult.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1 flex-1">
              <p className="font-semibold">{statusResult.message}</p>
              {statusResult.code && (
                <p className="font-mono text-[10px] opacity-80">
                  رمز الخطأ: {statusResult.code}
                </p>
              )}
              {statusResult.details && (
                <p className="font-mono text-[10px] opacity-75 break-all">
                  التفاصيل: {statusResult.details}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={handleVerifyConfig}
          disabled={testing || sendingTestMail}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
        >
          {testing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>جاري فحص الاتصال...</span>
            </>
          ) : (
            <span>فحص اتصال خادم SMTP</span>
          )}
        </button>
      </div>

      <form onSubmit={handleSendTestEmail} className="pt-2 border-t border-slate-100 space-y-2">
        <label className="block text-[11px] font-medium text-slate-600">
          إرسال بريد تجريبي للتأكد:
        </label>
        <div className="flex gap-2">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="admin@example.com"
            className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-physicsCyan-500 transition text-right"
          />
          <button
            type="submit"
            disabled={sendingTestMail || testing || !testEmail.trim()}
            className="px-3 py-1.5 bg-physicsCyan-600 hover:bg-physicsCyan-500 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1 disabled:opacity-50 shrink-0"
          >
            {sendingTestMail ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Send className="w-3 h-3 rotate-180" />
                <span>إرسال</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
