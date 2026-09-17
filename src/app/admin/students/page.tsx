import React from "react";
import { db } from "@/lib/db";
import { Check, ShieldAlert, ShieldCheck, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import { approveStudentAction, blockStudentAction, resetSessionsAction } from "./actions";
import DeleteStudentForm from "./DeleteStudentForm";

const CreateAccountModal = dynamic(() => import("./CreateAccountModal"), {
  ssr: false,
  loading: () => <div className="h-10 w-36 bg-slate-200 animate-pulse rounded-xl" />,
});

export default async function AdminStudentsPage() {
  // Query all users (students and admins)
  const users = await db.user.findMany({
    include: {
      sessions: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const getGradeName = (g: string, role: string) => {
    if (role === "ADMIN") return "حساب مسؤول (أدمن)";
    if (g === "1") return "الصف الأول الثانوي";
    if (g === "2") return "الصف الثاني الثانوي";
    return "الصف الثالث الثانوي";
  };

  return (
    <div className="space-y-6 text-right">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800">إدارة حسابات المنصة</h1>
          <p className="text-xs text-slate-500 mt-1">تفعيل الطلاب والمسؤولين، إضافة حسابات جديدة، حظر أو فك حظر الحسابات، وتفريغ الأجهزة.</p>
        </div>
        <CreateAccountModal />
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        {users.length === 0 ? (
          <p className="text-slate-400 text-xs py-6 text-center">لا يوجد حسابات مسجلة بالمنصة بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold">
                  <th className="pb-3 pt-1 pl-4 font-semibold">الاسم</th>
                  <th className="pb-3 pt-1 px-4 font-semibold">رقم الهاتف</th>
                  <th className="pb-3 pt-1 px-4 font-semibold">نوع الحساب / الصف</th>
                  <th className="pb-3 pt-1 px-4 font-semibold text-center">حالة الحساب</th>
                  <th className="pb-3 pt-1 px-4 font-semibold text-center">الجلسات النشطة</th>
                  <th className="pb-3 pt-1 pr-4 font-semibold text-left">إجراءات التحكم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 pl-4 font-bold text-slate-700 flex items-center gap-2">
                      <span>{userItem.name}</span>
                      {userItem.role === "ADMIN" && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300/60 rounded-md text-[10px] font-black">
                          أدمن
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-slate-500 font-mono">{userItem.phone}</td>
                    <td className="py-4 px-4 text-slate-500">{getGradeName(userItem.grade, userItem.role)}</td>
                    <td className="py-4 px-4 text-center">
                      {!userItem.isApproved ? (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md font-bold">
                          انتظار الموافقة
                        </span>
                      ) : userItem.isBlocked ? (
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
                      {userItem.sessions.length > 0 ? (
                        <span className="text-emerald-600 font-bold">{userItem.sessions.length} جهاز متصل</span>
                      ) : (
                        <span className="text-slate-400">لا يوجد أجهزة</span>
                      )}
                    </td>
                    <td className="py-4 pr-4 text-left">
                      <div className="flex gap-2 justify-end items-center flex-wrap">
                        {/* Session Reset */}
                        {userItem.sessions.length > 0 && (
                          <form action={resetSessionsAction}>
                            <input type="hidden" name="studentId" value={userItem.id} />
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
                        {!userItem.isApproved ? (
                          <>
                            <form action={approveStudentAction}>
                              <input type="hidden" name="studentId" value={userItem.id} />
                              <button
                                type="submit"
                                title="تفعيل وقبول الحساب"
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>موافقة</span>
                              </button>
                            </form>
                            <DeleteStudentForm studentId={userItem.id} />
                          </>
                        ) : (
                          <>
                            {/* Block Toggle */}
                            <form action={blockStudentAction}>
                              <input type="hidden" name="studentId" value={userItem.id} />
                              <input type="hidden" name="isBlocked" value={String(userItem.isBlocked)} />
                              <button
                                type="submit"
                                className={`px-2.5 py-1.5 rounded-lg font-bold text-[10px] transition flex items-center gap-1 ${
                                  userItem.isBlocked
                                    ? "bg-slate-100 text-slate-700 hover:bg-emerald-50 text-emerald-700 hover:border-emerald-250 border border-slate-200"
                                    : "bg-red-50 border border-red-150 text-red-700 hover:bg-red-500 hover:text-white"
                                }`}
                              >
                                {userItem.isBlocked ? (
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
