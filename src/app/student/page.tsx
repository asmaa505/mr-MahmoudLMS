import React from "react";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import UnlockForm from "./UnlockForm";
import UnlockCourseButton from "./UnlockCourseButton";
import { BookOpen, Lock, Unlock, GraduationCap, Award, HelpCircle, Layers, CheckCircle2 } from "lucide-react";
import Image from "next/image";

export default async function StudentDashboardPage() {
  const user = await requireAuth("STUDENT");

  // 1. Fetch all published courses matching user's grade
  const courses = await db.course.findMany({
    where: {
      isPublished: true,
      grade: user.grade,
    },
    orderBy: { createdAt: "desc" },
  });

  // 2. Fetch student's enrollments (unlocked course IDs)
  const enrollments = await db.enrollment.findMany({
    where: { userId: user.id },
    select: { courseId: true },
  });

  const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));
  const enrolledCourses = courses.filter((c) => enrolledCourseIds.has(c.id));

  // 3. Fetch student attempts stats
  const attempts = await db.quizAttempt.findMany({
    where: { userId: user.id },
    include: {
      quiz: true,
    },
  });

  const passedQuizzes = attempts.filter((a) => a.score >= (a.quiz?.passingScore || 50));
  const avgScore = attempts.length
    ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length)
    : 0;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-l from-physicsNavy-900 to-physicsNavy-700 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg shadow-physicsNavy-950/20">
        <div className="absolute top-0 left-0 w-48 h-48 bg-physicsCyan-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 text-right">
            <h1 className="text-xl md:text-2xl font-black">أهلاً بك يا {user.name} 👋</h1>
            <p className="text-physicsNavy-200 text-xs md:text-sm max-w-xl leading-relaxed">
              جاهز لتحدي جديد في الفيزياء؟ استكمل محاضراتك وراجع ملخصاتك وحل اختباراتك للوصول للدرجة النهائية.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-center min-w-[80px]">
              <span className="text-physicsCyan-400 font-extrabold text-xl block">{attempts.length}</span>
              <span className="text-[10px] text-physicsNavy-200 block mt-0.5">الاختبارات</span>
            </div>
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-center min-w-[80px]">
              <span className="text-emerald-400 font-extrabold text-xl block">{passedQuizzes.length}</span>
              <span className="text-[10px] text-physicsNavy-200 block mt-0.5">الناجحة</span>
            </div>
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-center min-w-[80px]">
              <span className="text-amber-400 font-extrabold text-xl block">%{avgScore}</span>
              <span className="text-[10px] text-physicsNavy-200 block mt-0.5">متوسط الدرجة</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Courses and Unlock Code Form */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left: Courses Grid (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-physicsNavy-600" />
              <span>مناهجك الدراسية المشتركة</span>
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 bg-physicsCyan-100 text-physicsCyan-800 rounded-full">
              {user.grade === "1" ? "الصف الأول الثانوي" : user.grade === "2" ? "الصف الثاني الثانوي" : "الصف الثالث الثانوي"}
            </span>
          </div>

          {enrolledCourses.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80">
              <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-sm">
                لم تشترك في أي كورسات بعد. يرجى إدخال كود التفعيل بالجانب لتفعيل كورس جديد والبدء في المذاكرة.
              </p>
            </div>
          ) : (
            <div className={`grid gap-6 ${enrolledCourses.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
              {enrolledCourses.map((course) => {
                const isUnlocked = enrolledCourseIds.has(course.id);
                return (
                  <div
                    key={course.id}
                    className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden flex flex-col hover:shadow-md transition group"
                  >
                    {/* Course Banner Image */}
                    <div className="relative aspect-video bg-slate-100">
                      {course.image ? (
                        <img
                          src={course.image}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center text-physicsCyan-400 font-bold">
                          \( \Phi \) Physics
                        </div>
                      )}
                      {/* Unlock Tag */}
                      <div className="absolute top-4 right-4 z-10 flex items-center justify-center">
                        {isUnlocked ? (
                          <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-white font-bold text-[10px] rounded-full shadow-md border border-white/10">
                            <Unlock className="w-3.5 h-3.5" />
                            مفتوح
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-950/85 text-white font-bold text-[10px] rounded-full backdrop-blur-sm shadow-md border border-white/10">
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                            مغلق
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Course Info */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h3 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2">
                          {course.title}
                        </h3>
                        <p className="text-slate-500 text-xs line-clamp-3 leading-relaxed">
                          {course.description || "لا يوجد وصف متوفر لهذا الكورس."}
                        </p>
                      </div>

                      <div className="pt-2">
                        {isUnlocked ? (
                          <Link
                            href={`/student/course/${course.id}`}
                            className="inline-flex w-full justify-center items-center py-2.5 bg-physicsNavy-700 hover:bg-physicsNavy-800 text-white text-xs font-bold rounded-xl transition"
                          >
                            ادخل للدراسة
                          </Link>
                        ) : (
                          <UnlockCourseButton />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Sidebar / Unlock Form (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <UnlockForm />

          {/* Student Stats Block */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4 text-right">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
              <Award className="w-5 h-5 text-physicsCyan-600" />
              <span>مستوى أدائك الأكاديمي</span>
            </h3>

            {attempts.length === 0 ? (
              <p className="text-slate-400 text-xs leading-relaxed py-2">
                لم تقم بحل أي اختبارات بعد. سيتم عرض إحصائيات مستواك بعد حل أول اختبار.
              </p>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">إجمالي محاولات الاختبارات:</span>
                  <span className="font-bold text-slate-800">{attempts.length} محاولة</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">الاختبارات التي اجتزتها:</span>
                  <span className="font-bold text-emerald-600">{passedQuizzes.length} من {attempts.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">متوسط درجاتك:</span>
                  <span className="font-bold text-slate-850 bg-slate-100 px-2 py-0.5 rounded-md">%{avgScore}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
