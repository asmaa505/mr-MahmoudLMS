"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileText,
  MessageCircle,
  PhoneCall,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  Award,
  Video,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Users,
} from "lucide-react";
import { formatEgyptianPhone } from "@/lib/whatsapp";
import { generateAllReportsAction, markReportSentAction } from "./actions";

interface StudentReportItem {
  id: string;
  name: string;
  phone: string;
  parentPhone: string | null;
  grade: string;
  subscriptionDate: Date;
  currentWeekNumber: number;
  latestReport: {
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
  } | null;
}

interface ReportsClientProps {
  studentsData: StudentReportItem[];
}

export default function ReportsClient({ studentsData }: ReportsClientProps) {
  const [selectedGrade, setSelectedGrade] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getGradeName = (g: string) => {
    if (g === "1") return "الصف الأول الثانوي";
    if (g === "2") return "الصف الثاني الثانوي";
    return "الصف الثالث الثانوي";
  };

  const handleGenerateAll = async () => {
    try {
      setIsGenerating(true);
      await generateAllReportsAction();
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredStudents = studentsData.filter((s) => {
    const matchesGrade = selectedGrade === "ALL" || s.grade === selectedGrade;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery) ||
      (s.parentPhone && s.parentPhone.includes(searchQuery));
    return matchesGrade && matchesSearch;
  });

  // Calculate platform averages
  const totalStudents = studentsData.length;
  const reportsCount = studentsData.filter((s) => s.latestReport).length;
  const avgWatch =
    reportsCount > 0
      ? Math.round(
          studentsData.reduce(
            (acc, curr) => acc + (curr.latestReport?.averageWatchPercentage || 0),
            0
          ) / reportsCount
        )
      : 0;
  const avgScore =
    reportsCount > 0
      ? Math.round(
          studentsData.reduce(
            (acc, curr) => acc + (curr.latestReport?.averageExamScore || 0),
            0
          ) / reportsCount
        )
      : 0;

  return (
    <div className="space-y-6 text-right">
      {/* Header and Batch Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-physicsCyan-600" />
            <span>تقارير المتابعة الأسبوعية للطلاب</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            متابعة نسب مشاهدة الفيديوهات، ودرجات الاختبارات، وإرسال التقارير التلقائية لأولياء الأمور والطلاب عبر واتساب بضغطة واحدة.
          </p>
        </div>

        <button
          onClick={handleGenerateAll}
          disabled={isGenerating}
          className="px-4 py-2.5 bg-gradient-to-r from-physicsCyan-600 to-physicsCyan-500 hover:from-physicsCyan-500 hover:to-physicsCyan-400 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-sm disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
          <span>{isGenerating ? "جاري احتساب وتحديث التقارير..." : "توليد وتحديث تقارير الأسبوع للجميع"}</span>
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Users className="w-4 h-4 text-blue-500" />
            <span>إجمالي الطلاب المسجلين</span>
          </div>
          <div className="text-xl font-black text-slate-800">{totalStudents}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>تقارير جاهزة للإرسال</span>
          </div>
          <div className="text-xl font-black text-emerald-600">{reportsCount}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Video className="w-4 h-4 text-physicsCyan-600" />
            <span>متوسط نسبة المشاهدة</span>
          </div>
          <div className="text-xl font-black text-slate-800">{avgWatch}%</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Award className="w-4 h-4 text-amber-500" />
            <span>متوسط درجات الاختبارات</span>
          </div>
          <div className="text-xl font-black text-slate-800">{avgScore}%</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Grade Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto w-full md:w-auto">
          {[
            { id: "ALL", label: "جميع الصفوف" },
            { id: "1", label: "أولى ثانوي" },
            { id: "2", label: "ثانية ثانوي" },
            { id: "3", label: "ثالثة ثانوي" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedGrade(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                selectedGrade === tab.id
                  ? "bg-white text-physicsCyan-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم الطالب أو رقم الهاتف..."
            className="w-full pl-4 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-physicsCyan-500 transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-12 text-slate-400 space-y-2">
            <FileText className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs">لم يتم العثور على طلاب مطابقين للبحث أو الفلتر المختار.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold">
                  <th className="pb-3 pt-1 pl-4 font-semibold">الطالب</th>
                  <th className="pb-3 pt-1 px-4 font-semibold">الصف</th>
                  <th className="pb-3 pt-1 px-4 font-semibold">الأسبوع الحالي</th>
                  <th className="pb-3 pt-1 px-4 font-semibold text-center">حضور المحاضرات</th>
                  <th className="pb-3 pt-1 px-4 font-semibold text-center">متوسط الاختبارات</th>
                  <th className="pb-3 pt-1 px-4 font-semibold text-center">حالة الإرسال</th>
                  <th className="pb-3 pt-1 pr-4 font-semibold text-left">إجراءات المراسلة والتقرير</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((item) => {
                  const rep = item.latestReport;
                  const encodedReport = rep ? encodeURIComponent(rep.summaryText) : "";

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                      {/* Name & Phones */}
                      <td className="py-4 pl-4">
                        <Link
                          href={`/admin/students/${item.id}`}
                          className="font-bold text-slate-800 hover:text-physicsCyan-600 transition flex items-center gap-1.5"
                        >
                          <span>{item.name}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </Link>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5 space-x-2 space-x-reverse">
                          <span>طالب: {item.phone}</span>
                          {item.parentPhone && (
                            <span className="text-slate-500">| ولي أمر: {item.parentPhone}</span>
                          )}
                        </div>
                      </td>

                      {/* Grade */}
                      <td className="py-4 px-4 text-slate-500 font-medium">
                        {getGradeName(item.grade)}
                      </td>

                      {/* Week number */}
                      <td className="py-4 px-4 font-semibold text-slate-700">
                        الأسبوع {item.currentWeekNumber}
                      </td>

                      {/* Watch percentage */}
                      <td className="py-4 px-4 text-center">
                        {rep ? (
                          <div className="inline-flex items-center gap-1.5">
                            <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  rep.averageWatchPercentage >= 80
                                    ? "bg-emerald-500"
                                    : rep.averageWatchPercentage >= 50
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                                }`}
                                style={{ width: `${rep.averageWatchPercentage}%` }}
                              />
                            </div>
                            <span className="font-bold text-slate-700 font-mono">
                              %{rep.averageWatchPercentage}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">قيد الحساب</span>
                        )}
                      </td>

                      {/* Average exam score */}
                      <td className="py-4 px-4 text-center">
                        {rep && rep.examsTakenCount > 0 ? (
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold font-mono ${
                              rep.averageExamScore >= 80
                                ? "bg-emerald-50 text-emerald-700"
                                : rep.averageExamScore >= 50
                                ? "bg-amber-50 text-amber-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            %{rep.averageExamScore}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">لا يوجد اختبارات</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        {rep?.sentToParentAt ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-md text-[10px] font-bold">
                            أُرسل لولي الأمر
                          </span>
                        ) : rep?.sentToStudentAt ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-md text-[10px] font-bold">
                            أُرسل للطالب
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-medium">
                            جاهز للإرسال
                          </span>
                        )}
                      </td>

                      {/* Send Actions */}
                      <td className="py-4 pr-4 text-left">
                        <div className="flex gap-1.5 justify-end items-center flex-wrap">
                          {rep ? (
                            <>
                              {/* WhatsApp Parent Button */}
                              {item.parentPhone && (
                                <form action={markReportSentAction}>
                                  <input type="hidden" name="reportId" value={rep.id} />
                                  <input type="hidden" name="target" value="PARENT" />
                                  <a
                                    href={`https://wa.me/${formatEgyptianPhone(
                                      item.parentPhone
                                    )}?text=${encodedReport}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="إرسال التقرير لولي الأمر عبر واتساب"
                                    onClick={(e) => {
                                      // Trigger form submission to mark sent timestamp
                                      const form = e.currentTarget.closest("form");
                                      if (form) form.requestSubmit();
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition flex items-center gap-1 shadow-sm"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span>واتساب ولي الأمر</span>
                                  </a>
                                </form>
                              )}

                              {/* WhatsApp Student Button */}
                              <form action={markReportSentAction}>
                                <input type="hidden" name="reportId" value={rep.id} />
                                <input type="hidden" name="target" value="STUDENT" />
                                <a
                                  href={`https://wa.me/${formatEgyptianPhone(
                                    item.phone
                                  )}?text=${encodedReport}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="إرسال التقرير للطالب عبر واتساب"
                                  onClick={(e) => {
                                    const form = e.currentTarget.closest("form");
                                    if (form) form.requestSubmit();
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] transition flex items-center gap-1 shadow-sm"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>واتساب الطالب</span>
                                </a>
                              </form>

                              {/* View Full Profile & Archive */}
                              <Link
                                href={`/admin/students/${item.id}`}
                                title="عرض السجل الأكاديمي الشامل"
                                className="p-1.5 rounded-lg border border-slate-200 hover:border-physicsCyan-500 text-slate-500 hover:text-physicsCyan-600 transition"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            </>
                          ) : (
                            <Link
                              href={`/admin/students/${item.id}`}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] transition"
                            >
                              عرض الملف
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
