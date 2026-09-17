"use client";

import React, { useState } from "react";
import { Trophy, Award, Medal, MessageSquare, CheckCircle, Sparkles, UserCheck, Calendar } from "lucide-react";
import { getWhatsAppDirectLink } from "@/lib/whatsapp";

interface AttemptWithUser {
  id: string;
  score: number;
  submittedAt: Date | string | null;
  user: {
    id: string;
    name: string;
    phone: string;
    grade: string;
  };
}

interface QuizLeaderboardProps {
  quizzes: {
    id: string;
    title: string;
    passingScore: number;
    chapter: {
      title: string;
      course: {
        title: string;
      };
    };
    attempts: AttemptWithUser[];
  }[];
}

export default function QuizLeaderboard({ quizzes }: QuizLeaderboardProps) {
  const [selectedQuizId, setSelectedQuizId] = useState<string>(quizzes[0]?.id || "");

  const activeQuiz = quizzes.find((q) => q.id === selectedQuizId);

  // Filter and deduplicate highest attempt per student
  const getLeaderboardData = () => {
    if (!activeQuiz || !activeQuiz.attempts) return [];

    const studentBestAttempts = new Map<string, AttemptWithUser>();

    activeQuiz.attempts.forEach((att) => {
      const existing = studentBestAttempts.get(att.user.id);
      if (!existing || att.score > existing.score) {
        studentBestAttempts.set(att.user.id, att);
      }
    });

    return Array.from(studentBestAttempts.values())
      .sort((a, b) => b.score - a.score || new Date(a.submittedAt || 0).getTime() - new Date(b.submittedAt || 0).getTime())
      .slice(0, 10); // Top 10
  };

  const leaderboard = getLeaderboardData();
  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];

  const getGradeText = (g: string) => {
    if (g === "1") return "الأول الثانوي";
    if (g === "2") return "الثاني الثانوي";
    return "الثالث الثانوي";
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 space-y-6 text-right shadow-sm">
      {/* Header & Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500 animate-bounce" />
            <h2 className="text-xl font-black text-slate-800">لوحة ودياجرام أوائل الامتحانات</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">تحديد المتفوقين والأوائل في كل امتحان بسهولة وإرسال تهنئة عبر الواتساب</p>
        </div>

        {quizzes.length > 0 && (
          <div className="w-full sm:w-auto">
            <select
              value={selectedQuizId}
              onChange={(e) => setSelectedQuizId(e.target.value)}
              className="w-full sm:w-64 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-physicsCyan-500 transition"
            >
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title} ({q.chapter.course.title})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!activeQuiz || leaderboard.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs space-y-2">
          <Award className="w-12 h-12 mx-auto text-slate-300" />
          <p>لا يوجد محاولات أو نتائج مسجلة لهذا الاختبار بعد.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Visual Podium Diagram */}
          <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-3xl p-6 md:p-8 text-white space-y-6 shadow-xl border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-physicsCyan-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="text-center space-y-1">
              <span className="text-[10px] font-bold px-3 py-1 bg-physicsCyan-500/20 text-physicsCyan-300 rounded-full border border-physicsCyan-500/30 inline-block">
                لوحة شرف متفوقي الامتحان
              </span>
              <h3 className="text-lg md:text-xl font-black text-amber-400">{activeQuiz.title}</h3>
            </div>

            {/* Podium Towers */}
            <div className="flex justify-center items-end gap-3 md:gap-6 pt-8 pb-4 min-h-[220px]">
              {/* 2nd Place */}
              {top2 ? (
                <div className="flex flex-col items-center w-1/3 max-w-[120px] space-y-2">
                  <div className="relative text-center">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-slate-700 border-2 border-slate-300 flex items-center justify-center font-black text-slate-200 text-lg shadow-lg mx-auto">
                      🥈
                    </div>
                    <p className="text-[11px] font-bold text-slate-200 truncate mt-1 max-w-[100px]">{top2.user.name}</p>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">%{Math.round(top2.score)}</span>
                  </div>
                  <div className="w-full bg-slate-700/80 border-t-4 border-slate-300 rounded-t-2xl h-24 flex items-center justify-center text-slate-300 font-black text-xl shadow-inner">
                    2
                  </div>
                </div>
              ) : (
                <div className="w-1/3 max-w-[120px]" />
              )}

              {/* 1st Place */}
              {top1 && (
                <div className="flex flex-col items-center w-1/3 max-w-[140px] space-y-2 -translate-y-2">
                  <div className="relative text-center">
                    <Sparkles className="w-5 h-5 text-amber-400 absolute -top-3 right-0 animate-pulse" />
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-300 border-2 border-amber-200 flex items-center justify-center font-black text-white text-2xl shadow-xl shadow-amber-500/20 mx-auto">
                      🥇
                    </div>
                    <p className="text-xs font-extrabold text-amber-300 truncate mt-1 max-w-[120px]">{top1.user.name}</p>
                    <span className="text-xs text-amber-400 font-mono font-extrabold">%{Math.round(top1.score)}</span>
                  </div>
                  <div className="w-full bg-gradient-to-b from-amber-500 to-amber-700 border-t-4 border-amber-300 rounded-t-2xl h-36 flex items-center justify-center text-white font-black text-3xl shadow-lg">
                    1
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {top3 ? (
                <div className="flex flex-col items-center w-1/3 max-w-[120px] space-y-2">
                  <div className="relative text-center">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-amber-900/60 border-2 border-amber-600 flex items-center justify-center font-black text-amber-500 text-lg shadow-lg mx-auto">
                      🥉
                    </div>
                    <p className="text-[11px] font-bold text-slate-300 truncate mt-1 max-w-[100px]">{top3.user.name}</p>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">%{Math.round(top3.score)}</span>
                  </div>
                  <div className="w-full bg-amber-950/80 border-t-4 border-amber-700 rounded-t-2xl h-16 flex items-center justify-center text-amber-600 font-black text-lg shadow-inner">
                    3
                  </div>
                </div>
              ) : (
                <div className="w-1/3 max-w-[120px]" />
              )}
            </div>
          </div>

          {/* Detailed Leaderboard Table */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Medal className="w-4 h-4 text-physicsCyan-600" />
              <span>ترتيب الطلاب الأوائل (Top 10):</span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold">
                    <th className="pb-3 pt-1 pl-4 font-semibold text-center w-12">المركز</th>
                    <th className="pb-3 pt-1 px-4 font-semibold">اسم الطالب المتفوق</th>
                    <th className="pb-3 pt-1 px-4 font-semibold">الصف الدراسي</th>
                    <th className="pb-3 pt-1 px-4 font-semibold">رقم الهاتف</th>
                    <th className="pb-3 pt-1 px-4 font-semibold text-center">النتيجة</th>
                    <th className="pb-3 pt-1 pr-4 font-semibold text-left">تهنئة الواتساب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaderboard.map((att, idx) => {
                    const waMessage = `أهلاً بك يا ${att.user.name} 🎉\nنهنئك في منصة مستر محمود الشحات للفيزياء بحصولك على المركز (${idx + 1}) في كويز *${activeQuiz.title}* بدرجة *%${Math.round(att.score)}*! ⚡\n\nواصل تميزك وتألقك معنا! 🚀`;
                    const waLink = getWhatsAppDirectLink(att.user.phone, waMessage);

                    return (
                      <tr key={att.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 pl-4 text-center font-black">
                          {idx === 0 ? (
                            <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto text-xs">🥇 1</span>
                          ) : idx === 1 ? (
                            <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center mx-auto text-xs">🥈 2</span>
                          ) : idx === 2 ? (
                            <span className="w-7 h-7 rounded-full bg-amber-50 text-amber-900 flex items-center justify-center mx-auto text-xs">🥉 3</span>
                          ) : (
                            <span className="text-slate-500 font-mono">#{idx + 1}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">{att.user.name}</td>
                        <td className="py-3.5 px-4 text-slate-500">{getGradeText(att.user.grade)}</td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono">{att.user.phone}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-bold font-mono">
                            %{Math.round(att.score)}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4 text-left">
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[11px] transition shadow-sm"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>إرسال تهنئة</span>
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
