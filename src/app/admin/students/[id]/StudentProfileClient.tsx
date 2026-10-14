"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Phone,
  PhoneCall,
  MessageCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Video,
  Award,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Send,
  BookOpen,
  GraduationCap,
  ExternalLink,
} from "lucide-react";
import { formatEgyptianPhone } from "@/lib/whatsapp";
import { formatDateArabic, getGradeLabel } from "@/lib/reports";
import { generateSingleStudentReportsAction, markReportSentAction } from "@/app/admin/reports/actions";

interface StudentProfileProps {
  student: {
    id: string;
    name: string;
    phone: string;
    parentPhone: string | null;
    grade: string;
    subscriptionDate: Date;
    createdAt: Date;
    isApproved: boolean;
    isBlocked: boolean;
  };
  lecturesProgress: {
    id: string;
    title: string;
    chapterTitle: string;
    courseTitle: string;
    duration: string | null;
    watchedSeconds: number;
    totalSeconds: number;
    watchPercentage: number;
    isCompleted: boolean;
    completedAt: Date | null;
  }[];
  quizAttempts: {
    id: string;
    quizTitle: string;
    chapterTitle: string;
    score: number;
    passingScore: number;
    isPassed: boolean;
    submittedAt: Date | null;
  }[];
  weeklyReports: {
    id: string;
    weekNumber: number;
    startDate: Date;
    endDate: Date;
    videosWatchedCount: number;
    totalVideosAvailable: number;
    averageWatchPercentage: number;
    examsTakenCount: number;
    averageExamScore: number;
    status: string;
    summaryText: string;
    sentToStudentAt: Date | null;
    sentToParentAt: Date | null;
    generatedAt: Date;
  }[];
}

export default function StudentProfileClient({
  student,
  lecturesProgress,
  quizAttempts,
  weeklyReports,
}: StudentProfileProps) {
  const [activeTab, setActiveTab] = useState<"REPORTS" | "VIDEOS" | "EXAMS">("REPORTS");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedReportId, setCopiedReportId] = useState<string | null>(null);

  const handleRefreshReports = async () => {
    try {
      setIsRefreshing(true);
      await generateSingleStudentReportsAction(student.id);
    } finally {
      setIsRefreshing(false);
    }
  };

  const copyToClipboard = (reportId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedReportId(reportId);
    setTimeout(() => setCopiedReportId(null), 2500);
  };

  // Aggregates
  const totalLectures = lecturesProgress.length;
  const completedLectures = lecturesProgress.filter((l) => l.isCompleted).length;
  const overallWatchPercentage =
    totalLectures > 0
      ? Math.round(
          lecturesProgress.reduce((acc, curr) => acc + curr.watchPercentage, 0) /
            totalLectures
        )
      : 0;

  const totalExams = quizAttempts.length;
  const passedExams = quizAttempts.filter((q) => q.isPassed).length;
  const overallAvgExamScore =
    totalExams > 0
      ? Math.round(
          quizAttempts.reduce((acc, curr) => acc + curr.score, 0) / totalExams
        )
      : 0;

  return (
    <div className="space-y-6 text-right">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/admin/students" className="hover:text-physicsCyan-600 transition">
          إدارة الطلاب
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href="/admin/reports" className="hover:text-physicsCyan-600 transition">
          التقارير الأسبوعية
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-800 font-bold">{student.name}</span>
      </div>

      {/* Header Profile Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black text-slate-800">
                {student.name}
              </h1>
              <span className="px-2.5 py-1 bg-physicsCyan-50 text-physicsCyan-700 border border-physicsCyan-200/60 rounded-xl text-xs font-bold">
                {getGradeLabel(student.grade)}
              </span>
              {student.isBlocked ? (
                <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-xl text-xs font-bold">
                  محظور
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold">
                  حساب نشط ومفعّل
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                تاريخ بدء الاشتراك والتقارير: {formatDateArabic(student.subscriptionDate)}
              </span>
            </p>
          </div>

          {/* Action to recalculate reports */}
          <button
            onClick={handleRefreshReports}
            disabled={isRefreshing}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "جاري التحديث..." : "إعادة احتساب التقارير الأسبوعية"}</span>
          </button>
        </div>

        {/* Contact Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          {/* Student Phone */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-slate-400 block">رقم هاتف الطالب</span>
              <span className="text-xs font-bold text-slate-800 font-mono">{student.phone}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <a
                href={`tel:${student.phone}`}
                title="اتصال بالطالب"
                className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
              >
                <PhoneCall className="w-4 h-4" />
              </a>
              <a
                href={`https://wa.me/${formatEgyptianPhone(student.phone)}`}
                target="_blank"
                rel="noopener noreferrer"
                title="مراسلة الطالب واتساب"
                className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Parent Phone */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-slate-400 block">رقم ولي الأمر (للمتابعة)</span>
              {student.parentPhone ? (
                <span className="text-xs font-bold text-slate-800 font-mono">{student.parentPhone}</span>
              ) : (
                <span className="text-xs text-slate-400">غير مسجل</span>
              )}
            </div>
            {student.parentPhone && (
              <div className="flex items-center gap-1.5">
                <a
                  href={`tel:${student.parentPhone}`}
                  title="اتصال هاتفي بولي الأمر"
                  className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                >
                  <PhoneCall className="w-4 h-4" />
                </a>
                <a
                  href={`https://wa.me/${formatEgyptianPhone(student.parentPhone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="مراسلة ولي الأمر واتساب"
                  className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Summary Metric Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-physicsCyan-50/50 border border-physicsCyan-100 text-center">
            <span className="text-[11px] font-bold text-physicsCyan-800 block">نسبة الحضور والمشاهدة</span>
            <span className="text-xl font-black text-physicsCyan-900 font-mono">%{overallWatchPercentage}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-center">
            <span className="text-[11px] font-bold text-slate-500 block">المحاضرات المكتملة</span>
            <span className="text-xl font-black text-slate-800 font-mono">
              {completedLectures} / {totalLectures}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 text-center">
            <span className="text-[11px] font-bold text-amber-800 block">متوسط درجات الاختبارات</span>
            <span className="text-xl font-black text-amber-900 font-mono">%{overallAvgExamScore}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-center">
            <span className="text-[11px] font-bold text-slate-500 block">الاختبارات المجتازة</span>
            <span className="text-xl font-black text-slate-800 font-mono">
              {passedExams} / {totalExams}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("REPORTS")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "REPORTS"
              ? "bg-physicsCyan-600 text-slate-950 shadow-sm"
              : "text-slate-500 hover:text-slate-800 bg-white"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>أرشيف التقارير الأسبوعية ({weeklyReports.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("VIDEOS")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "VIDEOS"
              ? "bg-physicsCyan-600 text-slate-950 shadow-sm"
              : "text-slate-500 hover:text-slate-800 bg-white"
          }`}
        >
          <Video className="w-4 h-4" />
          <span>تفاصيل مشاهدة المحاضرات ({lecturesProgress.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("EXAMS")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "EXAMS"
              ? "bg-physicsCyan-600 text-slate-950 shadow-sm"
              : "text-slate-500 hover:text-slate-800 bg-white"
          }`}
        >
          <Award className="w-4 h-4" />
          <span>سجل درجات الاختبارات ({quizAttempts.length})</span>
        </button>
      </div>

      {/* TAB 1: Weekly Reports Archive */}
      {activeTab === "REPORTS" && (
        <div className="space-y-4">
          {weeklyReports.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 text-slate-400 space-y-3">
              <Calendar className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs">لم يتم توليد أي تقارير أسبوعية لهذا الطالب حتى الآن.</p>
              <button
                onClick={handleRefreshReports}
                className="px-4 py-2 bg-physicsCyan-600 text-slate-950 text-xs font-bold rounded-xl hover:bg-physicsCyan-500 transition"
              >
                توليد التقرير الآن
              </button>
            </div>
          ) : (
            weeklyReports.map((report) => {
              const encodedReport = encodeURIComponent(report.summaryText);

              return (
                <div
                  key={report.id}
                  className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4"
                >
                  {/* Report Card Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-slate-800">
                          تقرير الأسبوع ({report.weekNumber})
                        </span>
                        <span className="text-xs text-slate-400">
                          ({formatDateArabic(report.startDate)} - {formatDateArabic(report.endDate)})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        حضور المحاضرات: <span className="font-bold text-slate-700 font-mono">%{report.averageWatchPercentage}</span> |
                        متوسط الاختبارات: <span className="font-bold text-slate-700 font-mono">%{report.averageExamScore}</span>
                      </div>
                    </div>

                    {/* Quick WhatsApp Send Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Copy report message */}
                      <button
                        onClick={() => copyToClipboard(report.id, report.summaryText)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:border-physicsCyan-500 hover:text-physicsCyan-700 text-xs font-semibold transition flex items-center gap-1.5"
                      >
                        {copiedReportId === report.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>نسخ التقرير</span>
                          </>
                        )}
                      </button>

                      {/* Send to Parent via WhatsApp */}
                      {student.parentPhone && (
                        <form action={markReportSentAction}>
                          <input type="hidden" name="reportId" value={report.id} />
                          <input type="hidden" name="target" value="PARENT" />
                          <a
                            href={`https://wa.me/${formatEgyptianPhone(
                              student.parentPhone
                            )}?text=${encodedReport}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              const form = e.currentTarget.closest("form");
                              if (form) form.requestSubmit();
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>إرسال لولي الأمر واتساب</span>
                          </a>
                        </form>
                      )}

                      {/* Send to Student via WhatsApp */}
                      <form action={markReportSentAction}>
                        <input type="hidden" name="reportId" value={report.id} />
                        <input type="hidden" name="target" value="STUDENT" />
                        <a
                          href={`https://wa.me/${formatEgyptianPhone(
                            student.phone
                          )}?text=${encodedReport}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            const form = e.currentTarget.closest("form");
                            if (form) form.requestSubmit();
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>إرسال للطالب واتساب</span>
                        </a>
                      </form>
                    </div>
                  </div>

                  {/* Formatted Report Preview Box */}
                  <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-xs font-mono whitespace-pre-wrap text-slate-700 leading-relaxed dir-rtl">
                    {report.summaryText}
                  </div>

                  {/* Send Log Status */}
                  <div className="flex items-center gap-4 text-[11px] text-slate-400">
                    {report.sentToParentAt && (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>أُرسل لولي الأمر في {formatDateArabic(report.sentToParentAt)}</span>
                      </span>
                    )}
                    {report.sentToStudentAt && (
                      <span className="flex items-center gap-1 text-blue-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>أُرسل للطالب في {formatDateArabic(report.sentToStudentAt)}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: Video Watch Progress Breakdown */}
      {activeTab === "VIDEOS" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm overflow-x-auto">
          {lecturesProgress.length === 0 ? (
            <p className="text-slate-400 text-xs py-8 text-center">لا يوجد محاضرات مسجلة للصف الدراسي بعد.</p>
          ) : (
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold">
                  <th className="pb-3 pt-1 pl-4 font-semibold">المحاضرة والكورس</th>
                  <th className="pb-3 pt-1 px-4 font-semibold text-center">نسبة المشاهدة</th>
                  <th className="pb-3 pt-1 px-4 font-semibold text-center">حالة الإكمال</th>
                  <th className="pb-3 pt-1 pr-4 font-semibold text-left">تاريخ الإكمال</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lecturesProgress.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 pl-4">
                      <div className="font-bold text-slate-800">{item.title}</div>
                      <div className="text-[11px] text-slate-400">
                        {item.courseTitle} • {item.chapterTitle}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.isCompleted ? "bg-emerald-500" : "bg-physicsCyan-500"
                            }`}
                            style={{ width: `${item.watchPercentage}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-700 font-mono">
                          %{item.watchPercentage}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.isCompleted ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-bold text-[10px]">
                          مكتملة
                        </span>
                      ) : item.watchPercentage > 0 ? (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md font-bold text-[10px]">
                          قيد المشاهدة
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px]">
                          لم تبدأ
                        </span>
                      )}
                    </td>
                    <td className="py-4 pr-4 text-left font-mono text-slate-500">
                      {item.completedAt ? formatDateArabic(item.completedAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 3: Exam Scores Breakdown */}
      {activeTab === "EXAMS" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm overflow-x-auto">
          {quizAttempts.length === 0 ? (
            <p className="text-slate-400 text-xs py-8 text-center">لم يقم الطالب بأداء أي اختبارات حتى الآن.</p>
          ) : (
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold">
                  <th className="pb-3 pt-1 pl-4 font-semibold">الاختبار</th>
                  <th className="pb-3 pt-1 px-4 font-semibold text-center">الدرجة المحققة</th>
                  <th className="pb-3 pt-1 px-4 font-semibold text-center">درجة النجاح</th>
                  <th className="pb-3 pt-1 px-4 font-semibold text-center">الحالة</th>
                  <th className="pb-3 pt-1 pr-4 font-semibold text-left">تاريخ التقديم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quizAttempts.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 pl-4 font-bold text-slate-800">
                      <div>{item.quizTitle}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{item.chapterTitle}</div>
                    </td>
                    <td className="py-4 px-4 text-center font-black font-mono text-sm">
                      <span
                        className={
                          item.score >= item.passingScore
                            ? "text-emerald-600"
                            : "text-red-600"
                        }
                      >
                        %{item.score}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center font-mono text-slate-500">
                      %{item.passingScore}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.isPassed ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-bold text-[10px]">
                          اجتاز بنجاح
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-md font-bold text-[10px]">
                          لم يجتز
                        </span>
                      )}
                    </td>
                    <td className="py-4 pr-4 text-left font-mono text-slate-500">
                      {item.submittedAt ? formatDateArabic(item.submittedAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
