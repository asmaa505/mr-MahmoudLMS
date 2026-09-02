import React from "react";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Play, FileText, Lock, HelpCircle, ChevronRight, GraduationCap, BookOpen, Layers } from "lucide-react";

interface CurriculumPageProps {
  params: Promise<{ grade: string }>;
  searchParams: Promise<{ courseId?: string }>;
}

export default async function PublicCurriculumPage({ params, searchParams }: CurriculumPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const grade = resolvedParams.grade;
  const activeCourseId = resolvedSearchParams.courseId;

  // Validate grade param
  if (grade !== "1" && grade !== "2" && grade !== "3") {
    redirect("/");
  }

  // 1. Fetch all published courses for this grade level
  const courses = await db.course.findMany({
    where: {
      isPublished: true,
      grade,
    },
    include: {
      chapters: {
        orderBy: { order: "asc" },
        include: {
          lectures: { orderBy: { order: "asc" } },
          quizzes: true,
          homeworks: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const getGradeName = (g: string) => {
    if (g === "1") return "الصف الأول الثانوي";
    if (g === "2") return "الصف الثاني الثانوي";
    return "الصف الثالث الثانوي";
  };

  // Determine active course for preview
  let activeCourse = null;
  if (activeCourseId) {
    activeCourse = courses.find((c) => c.id === activeCourseId) || null;
  } else if (courses.length > 0) {
    activeCourse = courses[0];
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white selection:bg-physicsCyan-500 selection:text-slate-900" dir="rtl">
      {/* Top Header */}
      <nav className="bg-slate-950/80 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-physicsCyan-500/10 border border-physicsCyan-500/20 text-physicsCyan-400">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-sm block">منصة الأستاذ محمود الشحات</span>
              <span className="text-[10px] text-physicsCyan-400 block -mt-0.5">معاينة المناهج التعليمية</span>
            </div>
          </Link>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="text-xs font-bold text-slate-300 hover:text-white px-4 py-2 rounded-xl transition"
            >
              تسجيل الدخول
            </Link>
            <Link
              href="/register"
              className="text-xs font-bold bg-physicsCyan-600 hover:bg-physicsCyan-500 text-slate-950 px-4 py-2 rounded-xl transition"
            >
              سجل مجاناً
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Breadcrumb & Grade Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-xs md:text-sm text-slate-400">
            <Link href="/" className="hover:text-physicsCyan-400 transition">الرئيسية</Link>
            <ChevronRight className="w-4 h-4 shrink-0" />
            <span className="text-white font-semibold">{getGradeName(grade)}</span>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-physicsCyan-500/10 border border-physicsCyan-500/20 text-physicsCyan-400 rounded-full">
            خطة الدراسة لعام {new Date().getFullYear()}
          </span>
        </div>

        {courses.length === 0 ? (
          <div className="bg-slate-950/40 border border-slate-800 rounded-3xl p-16 text-center space-y-4">
            <Layers className="w-12 h-12 text-slate-700 mx-auto" />
            <h2 className="text-lg font-bold">لا يوجد مناهج دراسية منشورة حالياً</h2>
            <p className="text-slate-500 text-xs max-w-sm mx-auto leading-relaxed">
              يقوم الأستاذ محمود الشحات برفع وتحديث المحتوى التعليمي بانتظام. ترقبوا الإعلان عن فتح التسجيل.
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Right: Course Selection Sidebar (4 cols) */}
            <div className="lg:col-span-4 space-y-4 lg:order-2">
              <h2 className="font-bold text-slate-300 text-sm">الكورسات المتاحة بالصف</h2>
              <div className="space-y-3">
                {courses.map((course) => {
                  const isActive = activeCourse?.id === course.id;
                  return (
                    <Link
                      key={course.id}
                      href={`/curriculum/${grade}?courseId=${course.id}`}
                      className={`block p-4 border rounded-2xl transition text-right relative overflow-hidden group ${
                        isActive
                          ? "bg-slate-950 border-physicsCyan-500/50 shadow-md shadow-physicsCyan-950/20"
                          : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <h3 className="font-bold text-xs text-white leading-snug group-hover:text-physicsCyan-300 transition">
                        {course.title}
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                        {course.description || "لا يوجد وصف متوفر لهذا الكورس."}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Left: Selected Course Curriculum Details (8 cols) */}
            <div className="lg:col-span-8 space-y-6 lg:order-1">
              {activeCourse && (
                <div className="space-y-6">
                  {/* Course Details Intro */}
                  <div className="bg-slate-950/50 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
                    <div className="absolute -top-12 -left-12 w-24 h-24 bg-physicsCyan-500/5 rounded-full blur-xl" />
                    <h2 className="text-xl font-bold text-white mb-2">{activeCourse.title}</h2>
                    <p className="text-slate-400 text-xs leading-relaxed mb-6">
                      {activeCourse.description || "استعرض فصول وحصص المنهج التعليمي بالأسفل."}
                    </p>

                    {/* Registration Redirect Card */}
                    <div className="p-4 bg-slate-900 border border-slate-800/80 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div className="text-right">
                        <span className="text-xs font-bold text-physicsCyan-400 block">هل ترغب بالاشتراك؟</span>
                        <span className="text-[10px] text-slate-400 block mt-1">سجل حساباً وفعل الكورس بكود التفعيل لبدء الدراسة.</span>
                      </div>
                      <Link
                        href={`/register?redirectTo=/student/course/${activeCourse.id}`}
                        className="px-6 py-2.5 bg-physicsCyan-600 hover:bg-physicsCyan-500 text-slate-950 text-xs font-bold rounded-xl transition shadow-lg shrink-0 w-full sm:w-auto text-center"
                      >
                        سجل لتفعيل الكورس
                      </Link>
                    </div>
                  </div>

                  {/* Chapters List */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-300 text-sm">مخطط الفصول والحصص</h3>

                    {activeCourse.chapters.length === 0 ? (
                      <p className="text-slate-500 text-xs py-4">لم يتم إضافة فصول لهذا الكورس بعد.</p>
                    ) : (
                      <div className="space-y-4">
                        {activeCourse.chapters.map((chapter) => (
                          <div key={chapter.id} className="bg-slate-950/20 border border-slate-800/60 rounded-2xl p-5 space-y-4">
                            {/* Chapter title header */}
                            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                              <h4 className="font-bold text-physicsCyan-400 text-xs">{chapter.title}</h4>
                            </div>

                            {/* Lectures list */}
                            <div className="mr-2 border-r border-slate-800 pr-4 space-y-3">
                              {chapter.lectures.map((lecture) => (
                                <Link
                                  key={lecture.id}
                                  href={`/register?redirectTo=/student/course/${activeCourse.id}`}
                                  className="flex items-center justify-between text-xs py-1 hover:text-physicsCyan-400 transition group text-slate-300"
                                >
                                  <span className="flex items-center gap-2">
                                    <Play className="w-4 h-4 text-slate-500 group-hover:text-physicsCyan-400" />
                                    <span>{lecture.title}</span>
                                  </span>
                                  <span className="flex items-center gap-2 text-[10px] text-slate-500 shrink-0">
                                    <span>{lecture.duration}</span>
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-950/80 text-white font-bold text-[9px] rounded-full backdrop-blur-sm shadow border border-white/10">
                                      <Lock className="w-2.5 h-2.5 text-amber-400" />
                                      <span>مغلق</span>
                                    </span>
                                  </span>
                                </Link>
                              ))}

                              {/* Quizzes */}
                              {chapter.quizzes.map((quiz) => (
                                <Link
                                  key={quiz.id}
                                  href={`/register?redirectTo=/student/course/${activeCourse.id}`}
                                  className="flex items-center justify-between text-xs py-1 border-t border-slate-800/40 pt-2 hover:text-physicsCyan-400 transition group text-slate-300"
                                >
                                  <span className="flex items-center gap-2">
                                    <HelpCircle className="w-4 h-4 text-indigo-500" />
                                    <span className="font-semibold">امتحان: {quiz.title}</span>
                                  </span>
                                  <span className="flex items-center gap-2 text-[10px] text-slate-500 shrink-0">
                                    <span>{quiz.duration} دقيقة</span>
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-950/80 text-white font-bold text-[9px] rounded-full backdrop-blur-sm shadow border border-white/10">
                                      <Lock className="w-2.5 h-2.5 text-amber-400" />
                                      <span>مغلق</span>
                                    </span>
                                  </span>
                                </Link>
                              ))}

                              {/* Homework PDFs */}
                              {chapter.homeworks.map((hw) => (
                                <Link
                                  key={hw.id}
                                  href={`/register?redirectTo=/student/course/${activeCourse.id}`}
                                  className="flex items-center gap-2 text-xs py-1 hover:text-physicsCyan-400 transition group text-slate-300"
                                >
                                  <FileText className="w-4 h-4 text-red-500" />
                                  <span className="flex-1 text-right">تحميل واجب: {hw.title}</span>
                                  <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-950/80 text-white font-bold text-[9px] rounded-full backdrop-blur-sm shadow border border-white/10 shrink-0">
                                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                                    <span>مغلق</span>
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
