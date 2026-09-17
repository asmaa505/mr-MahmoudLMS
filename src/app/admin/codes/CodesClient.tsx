"use client";

import React, { useState } from "react";
import { KeyRound, Plus, HelpCircle, Loader2, Clipboard, Check, Filter, MessageSquare, X, UserCheck, Send, ShieldAlert, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { getWhatsAppDirectLink, WhatsAppTemplates } from "@/lib/whatsapp";

interface Course {
  id: string;
  title: string;
}

interface Lecture {
  id: string;
  title: string;
  chapter: {
    course: {
      title: string;
    };
  };
}

interface Student {
  id: string;
  name: string;
  phone: string;
}

interface CodesClientProps {
  courses: Course[];
  lectures: Lecture[];
  students: Student[];
  initialCodes: any[];
}

export default function CodesClient({ courses, lectures, students, initialCodes }: CodesClientProps) {
  const [codes, setCodes] = useState<any[]>(initialCodes);
  const [scope, setScope] = useState<"COURSE" | "LECTURE">("COURSE");
  const [selectedCourseId, setSelectedCourseId] = useState(courses.length > 0 ? courses[0].id : "");
  const [selectedLectureId, setSelectedLectureId] = useState(lectures.length > 0 ? lectures[0].id : "");
  const [prefix, setPrefix] = useState("PHY");
  const [count, setCount] = useState("5");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUsed, setFilterUsed] = useState<"ALL" | "USED" | "ASSIGNED" | "UNUSED">("ALL");

  // WhatsApp Modal State for unassigned code
  const [selectedCodeForWhatsApp, setSelectedCodeForWhatsApp] = useState<any | null>(null);
  const [targetStudentId, setTargetStudentId] = useState<string>(students[0]?.id || "");
  const [customPhone, setCustomPhone] = useState<string>("");

  const router = useRouter();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const body = {
        scope,
        courseId: scope === "COURSE" ? selectedCourseId : null,
        lectureId: scope === "LECTURE" ? selectedLectureId : null,
        prefix,
        count,
      };

      const res = await fetch("/api/admin/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.refresh();
      setCodes((prev) => [...data.codes, ...prev]);
      alert(data.message);
    } catch (e: any) {
      alert("خطأ أثناء توليد الأكواد: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openWhatsAppAction = (codeObj: any) => {
    const targetName = codeObj.course?.title || codeObj.lecture?.title || "الكورس";

    if (codeObj.isUsed && codeObj.studentPhone) {
      // Direct WhatsApp link for student who already used it
      const message = WhatsAppTemplates.activationCode(codeObj.studentName || "الطالب", targetName, codeObj.code);
      const link = getWhatsAppDirectLink(codeObj.studentPhone, message);
      window.open(link, "_blank");
    } else if (codeObj.assignedStudentPhone) {
      // Direct WhatsApp link for student assigned to this code
      const message = WhatsAppTemplates.activationCode(codeObj.assignedStudentName || "الطالب", targetName, codeObj.code);
      const link = getWhatsAppDirectLink(codeObj.assignedStudentPhone, message);
      window.open(link, "_blank");
    } else {
      // Open selector modal for unassigned code
      setSelectedCodeForWhatsApp(codeObj);
      if (students.length > 0) {
        setTargetStudentId(students[0].id);
        setCustomPhone(students[0].phone);
      }
    }
  };

  const handleSendAndAssignWhatsApp = async () => {
    if (!selectedCodeForWhatsApp) return;

    setAssignLoading(true);
    const targetName = selectedCodeForWhatsApp.course?.title || selectedCodeForWhatsApp.lecture?.title || "الكورس";
    const selectedStudent = students.find((s) => s.id === targetStudentId);
    const destinationPhone = selectedStudent ? selectedStudent.phone : customPhone;
    const destinationName = selectedStudent ? selectedStudent.name : "الطالب";

    if (!destinationPhone) {
      alert("يرجى اختيار طالب أو إدخال رقم هاتف صالح");
      setAssignLoading(false);
      return;
    }

    try {
      // Call API to persist assignment in DB if student selected
      if (selectedStudent) {
        const res = await fetch("/api/admin/codes/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            codeId: selectedCodeForWhatsApp.id,
            studentId: selectedStudent.id,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          // Update local state
          setCodes((prev) =>
            prev.map((c) =>
              c.id === selectedCodeForWhatsApp.id
                ? {
                    ...c,
                    assignedToId: selectedStudent.id,
                    assignedStudentName: selectedStudent.name,
                    assignedStudentPhone: selectedStudent.phone,
                  }
                : c
            )
          );
        }
      }

      // Generate WhatsApp link and open chat
      const message = WhatsAppTemplates.activationCode(destinationName, targetName, selectedCodeForWhatsApp.code);
      const link = getWhatsAppDirectLink(destinationPhone, message);
      window.open(link, "_blank");

      setSelectedCodeForWhatsApp(null);
    } catch (err: any) {
      alert("حدث خطأ أثناء تخصيص الكود: " + err.message);
    } finally {
      setAssignLoading(false);
    }
  };

  // Filter codes with enhanced search (Code, Course, Student Name, Student Phone)
  const filteredCodes = codes.filter((c) => {
    const sTerm = searchTerm.trim().toLowerCase();

    const matchesSearch =
      !sTerm ||
      c.code.toLowerCase().includes(sTerm) ||
      (c.course?.title || "").toLowerCase().includes(sTerm) ||
      (c.lecture?.title || "").toLowerCase().includes(sTerm) ||
      (c.studentName || "").toLowerCase().includes(sTerm) ||
      (c.studentPhone || "").includes(sTerm) ||
      (c.assignedStudentName || "").toLowerCase().includes(sTerm) ||
      (c.assignedStudentPhone || "").includes(sTerm);

    const matchesUsed =
      filterUsed === "ALL"
        ? true
        : filterUsed === "USED"
        ? c.isUsed
        : filterUsed === "ASSIGNED"
        ? !c.isUsed && (!!c.assignedToId || !!c.assignedStudentName)
        : !c.isUsed && !c.assignedToId && !c.assignedStudentName;

    return matchesSearch && matchesUsed;
  });

  return (
    <div className="space-y-8 text-right">
      <div>
        <h1 className="text-xl md:text-2xl font-black text-slate-800">أكواد التفعيل والاشتراكات</h1>
        <p className="text-xs text-slate-500 mt-1">
          توليد وتخصيص بطاقات تفعيل للطلاب بالاسم ورقم التليفون لفتح الكورسات والمحاضرات ومنع تكرار الإرسال.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (5 cols): Code Generator Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
              <Plus className="w-5 h-5 text-physicsCyan-600 animate-pulse" />
              <span>توليد أكواد جديدة</span>
            </h2>

            <form onSubmit={handleGenerate} className="space-y-3 text-xs leading-relaxed">
              <div>
                <label className="block font-semibold text-slate-650 mb-1">نطاق التفعيل</label>
                <div className="flex gap-4 items-center">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={scope === "COURSE"}
                      onChange={() => setScope("COURSE")}
                      className="w-4 h-4 accent-physicsCyan-500"
                    />
                    <span>كورس كامل</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={scope === "LECTURE"}
                      onChange={() => setScope("LECTURE")}
                      className="w-4 h-4 accent-physicsCyan-500"
                    />
                    <span>محاضرة واحدة فقط</span>
                  </label>
                </div>
              </div>

              {scope === "COURSE" ? (
                <div>
                  <label className="block font-semibold text-slate-650 mb-1">اختر الكورس</label>
                  {courses.length === 0 ? (
                    <p className="text-[10px] text-red-500 bg-red-50 p-2.5 rounded border border-red-100">
                      الرجاء إنشاء كورس أولاً لإدارته.
                    </p>
                  ) : (
                    <select
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-physicsCyan-500"
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-650 mb-1">اختر المحاضرة</label>
                  {lectures.length === 0 ? (
                    <p className="text-[10px] text-red-500 bg-red-50 p-2.5 rounded border border-red-100">
                      الرجاء إضافة محاضرة أولاً.
                    </p>
                  ) : (
                    <select
                      value={selectedLectureId}
                      onChange={(e) => setSelectedLectureId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-physicsCyan-500"
                    >
                      {lectures.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.title} ({l.chapter.course.title})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-650 mb-1">بادئة الكود (Prefix)</label>
                  <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center focus:outline-none focus:border-physicsCyan-500 uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-650 mb-1">العدد المطلوب</label>
                  <select
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-physicsCyan-500"
                  >
                    <option value="1">1 كود</option>
                    <option value="5">5 أكواد</option>
                    <option value="10">10 أكواد</option>
                    <option value="20">20 كود</option>
                    <option value="50">50 كود</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-physicsCyan-600 hover:bg-physicsCyan-500 text-white font-bold rounded-xl transition shadow-md shadow-physicsCyan-500/10 flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>توليد الأكواد</span>}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column (7 cols): Codes List */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-100 pb-3">
            <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-physicsCyan-600" />
              <span>الأكواد الحالية ({filteredCodes.length})</span>
            </h2>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-slate-50 p-1 border border-slate-200 rounded-xl">
                <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
                <select
                  value={filterUsed}
                  onChange={(e) => setFilterUsed(e.target.value as any)}
                  className="bg-transparent text-[11px] font-semibold text-slate-700 outline-none"
                >
                  <option value="ALL">جميع الأكواد</option>
                  <option value="USED">تم التفعيل بواسطة طالب</option>
                  <option value="ASSIGNED">مخصصة لطالب (مرسلة)</option>
                  <option value="UNUSED">متاحة وغير مخصصة</option>
                </select>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث بالكود، اسم الطالب، أو رقم التليفون..."
                className="px-3 py-1.5 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none font-mono text-[10px] text-right w-48 sm:w-60"
              />
            </div>
          </div>

          {filteredCodes.length === 0 ? (
            <p className="text-slate-400 text-xs py-6 text-center">لا توجد أكواد مطابقة لخيارات التصفية والبحث.</p>
          ) : (
            <div className="overflow-x-auto text-[11px]">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold">
                    <th className="pb-3 pt-1 pl-4 font-semibold text-center">الكود</th>
                    <th className="pb-3 pt-1 px-4 font-semibold">المحتوى التعليمي</th>
                    <th className="pb-3 pt-1 px-4 font-semibold text-center">حالة الكود والتمريض</th>
                    <th className="pb-3 pt-1 px-4 font-semibold">الطالب المخصص / المستخدم</th>
                    <th className="pb-3 pt-1 pr-4 font-semibold text-left">الواتساب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCodes.map((c) => {
                    const targetName = c.course?.title || c.lecture?.title || "كورس غير معروف";
                    const isCourse = !!c.courseId;

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 pl-4 text-center">
                          <span className="flex items-center gap-1.5 justify-center font-mono font-bold text-slate-800">
                            <button
                              onClick={() => handleCopy(c.code, c.id)}
                              className="p-1 rounded hover:bg-slate-100 text-slate-450 hover:text-slate-800 transition"
                            >
                              {copiedId === c.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Clipboard className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <span>{c.code}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 max-w-[180px] truncate" title={targetName}>
                          <span className="font-bold text-slate-700 block truncate">{targetName}</span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            {isCourse ? "كورس كامل" : "محاضرة منفردة"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {c.isUsed ? (
                            <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-md font-bold">
                              تم التفعيل
                            </span>
                          ) : c.assignedStudentName ? (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/60 rounded-md font-bold">
                              مخصص مرسل
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-bold">
                              متاح وغير مخصص
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {c.isUsed ? (
                            <div>
                              <p className="font-bold text-slate-800 flex items-center gap-1">
                                <span>{c.studentName}</span>
                              </p>
                              <p className="text-[9px] text-slate-500 font-mono mt-0.5">{c.studentPhone}</p>
                            </div>
                          ) : c.assignedStudentName ? (
                            <div>
                              <p className="font-bold text-amber-900 flex items-center gap-1">
                                <span>{c.assignedStudentName}</span>
                              </p>
                              <p className="text-[9px] text-amber-700 font-mono mt-0.5">{c.assignedStudentPhone}</p>
                            </div>
                          ) : (
                            <span className="text-slate-350">غير مخصص بعد</span>
                          )}
                        </td>
                        <td className="py-3.5 pr-4 text-left">
                          <button
                            onClick={() => openWhatsAppAction(c)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-bold rounded-xl text-[10px] transition shadow-sm ${
                              c.isUsed
                                ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                : c.assignedStudentName
                                ? "bg-amber-600 hover:bg-amber-500 text-white"
                                : "bg-emerald-600 hover:bg-emerald-500 text-white"
                            }`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{c.assignedStudentName ? "مخصص (إعادة إرسال)" : "تخصيص وإرسال"}</span>
                          </button>
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

      {/* Modal for selecting target student for unassigned activation code */}
      {selectedCodeForWhatsApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md space-y-6 text-right shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-800">تخصيص وإرسال كود التفعيل لطالب</h3>
                <p className="text-xs text-slate-400 mt-0.5">اختر الطالب ليتم ربط الكود باسمه وتجنب إرساله لطالب آخر</p>
              </div>
              <button
                onClick={() => setSelectedCodeForWhatsApp(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <p className="font-bold text-slate-700">الكود المخصص للإرسال:</p>
              <p className="font-mono font-extrabold text-physicsCyan-700 text-sm">{selectedCodeForWhatsApp.code}</p>
              <p className="text-[10px] text-slate-400">
                المحتوى: {selectedCodeForWhatsApp.course?.title || selectedCodeForWhatsApp.lecture?.title || "الكورس"}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">اختر الطالب من المسجلين بالمنصة</label>
                {students.length === 0 ? (
                  <p className="text-xs text-slate-400">لا يوجد طلاب مسجلون بعد.</p>
                ) : (
                  <select
                    value={targetStudentId}
                    onChange={(e) => {
                      setTargetStudentId(e.target.value);
                      const s = students.find((st) => st.id === e.target.value);
                      if (s) setCustomPhone(s.phone);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-physicsCyan-500 transition"
                  >
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.phone})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 block">أدخل رقم التليفون</label>
                  {(() => {
                    const matched = students.find((s) => s.id === targetStudentId);
                    return matched ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        ✓ تم المطابقة: {matched.name}
                      </span>
                    ) : null;
                  })()}
                </div>
                <input
                  type="tel"
                  value={customPhone}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomPhone(val);
                    const cleanVal = val.trim();
                    if (cleanVal.length >= 3) {
                      const matched = students.find(
                        (st) => st.phone.includes(cleanVal) || cleanVal.includes(st.phone)
                      );
                      if (matched) {
                        setTargetStudentId(matched.id);
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const cleanVal = customPhone.trim();
                      const matched = students.find(
                        (st) => st.phone.includes(cleanVal) || cleanVal.includes(st.phone)
                      );
                      if (matched) {
                        setTargetStudentId(matched.id);
                        setCustomPhone(matched.phone);
                      }
                    }
                  }}
                  placeholder="اكتب رقم الهاتف واضغط Enter..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-physicsCyan-500 transition dir-ltr text-right"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  تلميح: بمجرد كتابة رقم الموبايل أو الضغط على Enter، سيتم تلقائياً تحديد اسم الطالب صاحب الرقم في الخانة العلوية.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSendAndAssignWhatsApp}
                  disabled={assignLoading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex justify-center items-center gap-2 shadow-md shadow-emerald-600/10"
                >
                  {assignLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>تخصيص الكود وفتح الواتساب للطالب</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
