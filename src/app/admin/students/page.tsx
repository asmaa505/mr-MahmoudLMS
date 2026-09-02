import React from "react";
import { db } from "@/lib/db";
import { Check, X, ShieldAlert, ShieldCheck, RefreshCw, AlertTriangle, GraduationCap } from "lucide-react";
import { approveStudentAction, blockStudentAction, resetSessionsAction } from "./actions";
import DeleteStudentForm from "./DeleteStudentForm";

export default async function AdminStudentsPage() {
  // Query all students
  const students = await db.user.findMany({
    where: { role: "STUDENT" },
    include: {
      sessions: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const getGradeName = (g: string) => {
    if (g === "1") return "الصف الأول الثانوي";
    if (g === "2") return "الصف الثاني الثانوي";
    return "الصف الثالث الثانوي";
  };

  return (
    <div className="space-y-6 text-right">
      <div>
        <h1 className="text-xl md:text-2xl font-black text-slate-800">إدارة حسابات الطلاب</h1>
        <p className="text-xs text-slate-500 mt-1">تفعيل تسجيلات الطلاب الجدد، حظر أو فك حظر الطلاب، وإعادة تعيين أجهزة تسجيل الدخول النشطة.</p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        {students.length === 0 ? (
          <p className="text-slate-400 text-xs py-6 text-center">لا يوجد طلاب مسجلون بالمنصة بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold">
                  <th className="pb-3 pt-1 pl-4 font-semibold">اسم الطالب</th>
                  <th className="pb-3 pt-1 px-4 font-semibold">رقم الهاتف</th>
                  <th className="pb-3 pt-1 px-4 font-semibold">الصف الدراسي</th>
                  <th className="pb-3 pt-1 px-4 font-semibold text-center">حالة الحساب</th>
                  <th className="pb-3 pt-1 px-4 font-semibold text-center">الجلسات النشطة</th>
                  <th className="pb-3 pt-1 pr-4 font-semibold text-left">إجراءات التحكم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 pl-4 font-bold text-slate-700">{student.name}</td>
                    <td className="py-4 px-4 text-slate-500 font-mono">{student.phone}</td>
                    <td className="py-4 px-4 text-slate-500">{getGradeName(student.grade)}</td>
                    <td className="py-4 px-4 text-center">
                      {!student.isApproved ? (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md font-bold">
                          انتظار الموافقة
                        </span>
                      ) : student.isBlocked ? (
                        <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-md font-bold">
                          محظور
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-bold">
                          نشط ومفعّل
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center font-mono">
                      {student.sessions.length > 0 ? (
                        <span className="text-emerald-600 font-bold">{student.sessions.length} جهاز متصل</span>
                      ) : (
                        <span className="text-slate-400">لا يوجد أجهزة</span>
                      )}
                    </td>
                    <td className="py-4 pr-4 text-left">
                      <div className="flex gap-2 justify-end items-center flex-wrap">
                        {/* Session Reset (Limit Bypass) */}
                        {student.sessions.length > 0 && (
                          <form action={resetSessionsAction}>
                            <input type="hidden" name="studentId" value={student.id} />
                            <button
                              type="submit"
                              title="تسجيل خروج من جميع الأجهزة النشطة"
                              className="p-1.5 rounded-lg border border-slate-200 hover:border-physicsCyan-500 text-slate-500 hover:text-physicsCyan-600 transition"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        )}

                        {/* Approvals */}
                        {!student.isApproved ? (
                          <>
                            <form action={approveStudentAction}>
                              <input type="hidden" name="studentId" value={student.id} />
                              <button
                                type="submit"
                                title="تفعيل وقبول الحساب"
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>موافقة</span>
                              </button>
                            </form>
                            <DeleteStudentForm studentId={student.id} />
                          </>
                        ) : (
                          <>
                            {/* Block Toggle */}
                            <form action={blockStudentAction}>
                              <input type="hidden" name="studentId" value={student.id} />
                              <input type="hidden" name="isBlocked" value={String(student.isBlocked)} />
                              <button
                                type="submit"
                                className={`px-2.5 py-1.5 rounded-lg font-bold text-[10px] transition flex items-center gap-1 ${
                                  student.isBlocked
                                    ? "bg-slate-100 text-slate-700 hover:bg-emerald-50 text-emerald-700 hover:border-emerald-250 border border-slate-200"
                                    : "bg-red-50 border border-red-150 text-red-700 hover:bg-red-500 hover:text-white"
                                }`}
                              >
                                {student.isBlocked ? (
                                  <>
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>فك الحظر</span>
                                  </>
                                ) : (
                                  <>
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    <span>حظر الحساب</span>
                                  </>
                                )}
                              </button>
                            </form>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
