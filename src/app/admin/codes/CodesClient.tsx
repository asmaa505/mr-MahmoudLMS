"use client";

import React, { useState } from "react";
import { KeyRound, Plus, HelpCircle, Loader2, Clipboard, Check, Filter } from "lucide-react";
import { useRouter } from "next/navigation";

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

interface CodesClientProps {
  courses: Course[];
  lectures: Lecture[];
  initialCodes: any[];
}

export default function CodesClient({ courses, lectures, initialCodes }: CodesClientProps) {
  const [codes, setCodes] = useState<any[]>(initialCodes);
  const [scope, setScope] = useState<"COURSE" | "LECTURE">("COURSE");
  const [selectedCourseId, setSelectedCourseId] = useState(courses.length > 0 ? courses[0].id : "");
  const [selectedLectureId, setSelectedLectureId] = useState(lectures.length > 0 ? lectures[0].id : "");
  const [prefix, setPrefix] = useState("PHY");
  const [count, setCount] = useState("5");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUsed, setFilterUsed] = useState<"ALL" | "USED" | "UNUSED">("ALL");

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

      // We refresh the page to pull the fully populated list of codes with student names
      router.refresh();
      // Temporarily append locally (without relations for quick response)
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

  // Filter codes
  const filteredCodes = codes.filter((c) => {
    const matchesSearch = c.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUsed =
      filterUsed === "ALL" ? true : filterUsed === "USED" ? c.isUsed : !c.isUsed;
    return matchesSearch && matchesUsed;
  });

  return (
    <div className="space-y-8 text-right">
      <div>
        <h1 className="text-xl md:text-2xl font-black text-slate-800">أكواد التفعيل والاشتراكات</h1>
        <p className="text-xs text-slate-500 mt-1">
          توليد بطاقات تفعيل للطلاب لفتح فصول أو محاضرات معينة لمشاهدة الفيديوهات وتنزيل ملخصات الدروس.
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
                      className="w-full px-3 py-2 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none cursor-pointer"
                      required
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
                      الرجاء إضافة محاضرات أولاً في الكورسات.
                    </p>
                  ) : (
                    <select
                      value={selectedLectureId}
                      onChange={(e) => setSelectedLectureId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none cursor-pointer"
                      required
                    >
                      {lectures.map((l) => (
                        <option key={l.id} value={l.id}>
                          [{l.chapter.course.title}] - {l.title}
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
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="مثال: PHY-MECH"
                    className="w-full px-3 py-2 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none text-center font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-650 mb-1">العدد المطلوب</label>
                  <select
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none cursor-pointer"
                    required
                  >
                    <option value="1">1 كود</option>
                    <option value="5">5 أكواد</option>
                    <option value="10">10 أكواد</option>
                    <option value="20">20 كود</option>
                    <option value="50">50 كود (أقصى حد)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || (scope === "COURSE" && courses.length === 0) || (scope === "LECTURE" && lectures.length === 0)}
                className="w-full py-2.5 bg-physicsCyan-600 hover:bg-physicsCyan-500 text-white font-bold rounded-lg transition flex justify-center items-center gap-1.5 disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>توليد الأكواد</span>}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column (7 cols): Activation Codes List */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
          {/* Search and Filters */}
          <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-100 pb-4 text-xs">
            <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-physicsCyan-600" />
              <span>الأكواد الحالية ({filteredCodes.length})</span>
            </h2>

            <div className="flex gap-2 items-center">
              <div className="flex items-center gap-1 border border-slate-200 px-2 py-1.5 rounded-lg bg-slate-50">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterUsed}
                  onChange={(e: any) => setFilterUsed(e.target.value)}
                  className="bg-transparent outline-none cursor-pointer text-slate-600 font-semibold"
                >
                  <option value="ALL">كل الأكواد</option>
                  <option value="USED">المستخدمة فقط</option>
                  <option value="UNUSED">النشطة غير المستخدمة</option>
                </select>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث بكتابة الكود..."
                className="px-3 py-1.5 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none font-mono text-[10px] text-left"
              />
            </div>
          </div>

          {filteredCodes.length === 0 ? (
            <p className="text-slate-400 text-xs py-6 text-center">لا توجد أكواد مطابقة لخيارات التصفية.</p>
          ) : (
            <div className="overflow-x-auto text-[11px]">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold">
                    <th className="pb-3 pt-1 pl-4 font-semibold text-center">الكود</th>
                    <th className="pb-3 pt-1 px-4 font-semibold">يفتح كورس / محاضرة</th>
                    <th className="pb-3 pt-1 px-4 font-semibold text-center">الحالة</th>
                    <th className="pb-3 pt-1 pr-4 font-semibold text-left">المستخدم</th>
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
                        <td className="py-3.5 px-4 max-w-[200px] truncate" title={targetName}>
                          <span className="font-bold text-slate-700 block truncate">{targetName}</span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            {isCourse ? "نطاق: كورس كامل" : "نطاق: محاضرة منفردة"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {c.isUsed ? (
                            <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded font-bold">
                              تم التفعيل
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded font-bold">
                              نشط وصالح
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 pr-4 text-left">
                          {c.isUsed ? (
                            <div>
                              <p className="font-bold text-slate-750">{c.studentName}</p>
                              <p className="text-[9px] text-slate-400 mt-0.5">
                                {c.usedAt ? new Date(c.usedAt).toLocaleDateString("ar-EG") : ""}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-350">متاح للاستخدام</span>
                          )}
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
    </div>
  );
}
