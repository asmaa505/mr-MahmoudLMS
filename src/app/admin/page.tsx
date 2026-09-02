import React from "react";
import { db } from "@/lib/db";
import { Users, BookOpen, KeyRound, HelpCircle, Trophy, UserCheck } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboardPage() {
  // Query platform statistics
  const totalStudents = await db.user.count({ where: { role: "STUDENT" } });
  const pendingStudents = await db.user.count({ where: { role: "STUDENT", isApproved: false } });
  const totalCourses = await db.course.count();
  const totalQuizzes = await db.quiz.count();
  const totalCodes = await db.activationCode.count();
  const usedCodes = await db.activationCode.count({ where: { isUsed: true } });

  // Get average quiz attempt score
  const attempts = await db.quizAttempt.findMany({ select: { score: true } });
  const avgQuizScore = attempts.length
    ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length)
    : 0;

  // Get recent quiz attempts (last 5)
  const recentAttempts = await db.quizAttempt.findMany({
    take: 5,
    orderBy: { submittedAt: "desc" },
    include: {
      user: true,
      quiz: true,
    },
  });

  // Stats Card data
  const statCards = [
    {
      label: "إجمالي الطلاب",
      value: totalStudents,
      color: "text-blue-650 bg-blue-50 border-blue-100",
      icon: Users,
    },
    {
      label: "طلاب قيد الانتظار",
      value: pendingStudents,
      color: "text-amber-650 bg-amber-50 border-amber-100",
      icon: UserCheck,
    },
    {
      label: "إجمالي الكورسات",
      value: totalCourses,
      color: "text-purple-650 bg-purple-50 border-purple-100",
      icon: BookOpen,
    },
    {
      label: "أكواد التفعيل (المستخدمة)",
      value: `${usedCodes} / ${totalCodes}`,
      color: "text-emerald-650 bg-emerald-50 border-emerald-100",
      icon: KeyRound,
    },
  ];

  return (
    <div className="space-y-8 text-right">
      {/* Page Title */}
      <div>
        <h1 className="text-xl md:text-2xl font-black text-slate-800">مرحباً بك يا أستاذ محمود الشحات</h1>
        <p className="text-xs text-slate-500 mt-1">نظرة عامة على حالة المنصة التعليمية وأداء الطلاب.</p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <div
            key={idx}
            className="bg-white border border-slate-200/80 rounded-2xl p-6 flex items-center justify-between"
          >
            <div className="space-y-1">
              <span className="text-slate-400 text-xs font-semibold block">{stat.label}</span>
              <span className="text-lg md:text-2xl font-black text-slate-800 block">{stat.value}</span>
            </div>
            <div className={`p-3.5 rounded-2xl border ${stat.color}`}>
              <stat.icon className="w-6 h-6 shrink-0" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Section Grid */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols): Recent Quiz Attempts */}
        <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Trophy className="w-5 h-5 text-physicsCyan-600" />
              <span>آخر محاولات وحل الاختبارات</span>
            </h2>
            <Link
              href="/admin/quizzes"
              className="text-xs font-semibold text-physicsCyan-600 hover:underline"
            >
              عرض جميع الاختبارات
            </Link>
          </div>

          {recentAttempts.length === 0 ? (
            <p className="text-slate-400 text-xs py-4 text-center">لا توجد محاولات اختبارات مسجلة بعد.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold">
                    <th className="pb-3 pt-1 pl-4 font-semibold">اسم الطالب</th>
                    <th className="pb-3 pt-1 px-4 font-semibold">الاختبار</th>
                    <th className="pb-3 pt-1 px-4 font-semibold text-center">الدرجة</th>
                    <th className="pb-3 pt-1 pr-4 font-semibold text-left">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentAttempts.map((attempt) => {
                    const isPassed = attempt.score >= (attempt.quiz?.passingScore || 50);
                    const formattedDate = attempt.submittedAt
                      ? new Date(attempt.submittedAt).toLocaleDateString("ar-EG", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "تاريخ غير معروف";

                    return (
                      <tr key={attempt.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 pl-4 font-bold text-slate-700">{attempt.user?.name}</td>
                        <td className="py-3 px-4 text-slate-500">{attempt.quiz?.title}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`font-semibold px-2 py-0.5 rounded-md ${
                              isPassed ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                            }`}
                          >
                            %{attempt.score}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-400 text-left font-mono">{formattedDate}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Secondary stats */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm text-right space-y-6">
          <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-4">
            <HelpCircle className="w-5 h-5 text-physicsCyan-600" />
            <span>نظرة عامة على الأداء العلمي</span>
          </h2>

          <div className="space-y-4 text-xs leading-relaxed">
            <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-2">
              <span className="text-slate-400 text-[10px] block">متوسط درجات الطلاب الكلي</span>
              <span className="font-black text-2xl text-slate-800 block">%{avgQuizScore}</span>
              <p className="text-[10px] text-slate-500">
                يتم حسابه كمتوسط نسبة الإجابة الصحيحة للطلاب في جميع الاختبارات.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-2">
              <span className="text-slate-400 text-[10px] block">إجمالي أسئلة بنك الاختبارات</span>
              <span className="font-black text-2xl text-slate-800 block">{totalQuizzes}</span>
              <p className="text-[10px] text-slate-500">
                اختبارات تم ربطها بالفصول لتنظيم فتح الفيديوهات والواجبات.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
