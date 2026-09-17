import React from "react";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import VideoPlayer from "@/components/VideoPlayer";
import { headers } from "next/headers";
import { Play, FileText, CheckCircle, AlertTriangle, ChevronRight, Lock, HelpCircle } from "lucide-react";

interface CoursePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lectureId?: string }>;
}

export default async function StudentCoursePage({ params, searchParams }: CoursePageProps) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const courseId = resolvedParams.id;
  const activeLectureId = resolvedSearchParams.lectureId;

  // 1. Confirm student is enrolled
  const enrollment = await db.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: user.id,
        courseId,
      },
    },
  });

  if (!enrollment) {
    redirect("/student");
  }

  // 2. Fetch course with chapters, lectures, quizzes, homeworks
  const course = await db.course.findUnique({
    where: { id: courseId },
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
  });

  if (!course) {
    redirect("/student");
  }

  // 3. Fetch all quiz attempts for the student in this course
  const quizIds = course.chapters.flatMap((ch) => ch.quizzes.map((q) => q.id));
  const attempts = await db.quizAttempt.findMany({
    where: {
      userId: user.id,
      quizId: { in: quizIds },
    },
  });

  // Helper to check if a quiz is passed
  const isQuizPassed = (quizId: string, passingScore: number) => {
    const quizAttempts = attempts.filter((a) => a.quizId === quizId);
    return quizAttempts.some((a) => a.score >= passingScore);
  };

  // Determine active lecture
  let activeLecture = null;
  const allLectures = course.chapters.flatMap((ch) => ch.lectures);

  if (activeLectureId) {
    activeLecture = allLectures.find((l) => l.id === activeLectureId) || null;
  } else if (allLectures.length > 0) {
    activeLecture = allLectures[0];
  }

  // Find IP Address for security watermark overlay
  const headersList = await headers();
  const rawIp = headersList.get("x-forwarded-for") || "127.0.0.1";
  const studentIp = rawIp.split(",")[0].trim();

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500">
        <Link href="/student" className="hover:text-physicsCyan-600 transition">الرئيسية</Link>
        <ChevronRight className="w-4 h-4 shrink-0" />
        <span className="text-slate-800 font-semibold">{course.title}</span>
      </div>

      {/* Main Grid: Video Player + Sidebar */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Area (8 cols): Video Player and Description */}
        <div className="lg:col-span-8 space-y-6">
          {activeLecture ? (
            <div className="space-y-4">
              {/* Check if active lecture is locked behind a prerequisite quiz */}
              {(() => {
                // For simplicity, a lecture is locked if there's any mandatory quiz in the *same chapter* that the student hasn't passed,
                // UNLESS this is the first lecture of the chapter.
                const currentChapter = course.chapters.find((ch) =>
                  ch.lectures.some((l) => l.id === activeLecture.id)
                );

                if (!currentChapter) return null;

                const chapterQuiz = currentChapter.quizzes[0];
                const isFirstLecture = currentChapter.lectures[0]?.id === activeLecture.id;

                if (chapterQuiz && chapterQuiz.isMandatory && !isFirstLecture && !isQuizPassed(chapterQuiz.id, chapterQuiz.passingScore)) {
                  return (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center aspect-video flex flex-col justify-center items-center space-y-4 text-white">
                      <Lock className="w-12 h-12 text-amber-500 animate-pulse" />
                      <h3 className="font-bold text-base md:text-lg">هذه المحاضرة مغلقة حالياً</h3>
                      <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                        يجب عليك أولاً اجتياز اختبار الفصل: <br />
                        <span className="text-physicsCyan-400 font-semibold">{chapterQuiz.title}</span> <br />
                        بدرجة لا تقل عن <span className="text-physicsCyan-400 font-bold">%{chapterQuiz.passingScore}</span> لفتح باقي المحاضرات.
                      </p>
                      <Link
                        href={`/student/quiz/${chapterQuiz.id}`}
                        className="px-6 py-2.5 bg-physicsCyan-600 hover:bg-physicsCyan-500 text-slate-950 font-bold rounded-xl text-xs transition"
                      >
                        ابدأ الاختبار الآن
                      </Link>
                    </div>
                  );
                }

                // If unlocked, render secure watermark video player
                const isExternalEmbed =
                  activeLecture.videoUrl.includes("youtube.com") ||
                  activeLecture.videoUrl.includes("youtu.be") ||
                  activeLecture.videoUrl.includes("vimeo.com");
                const secureVideoUrl = isExternalEmbed
                  ? activeLecture.videoUrl
                  : `/api/video/stream?lectureId=${activeLecture.id}`;

                return (
                  <div className="space-y-4">
                    <VideoPlayer
                      videoUrl={secureVideoUrl}
                      studentName={user.name}
                      studentPhone={user.phone}
                      studentIp={studentIp}
                    />
                    <div className="bg-white rounded-2xl p-6 border border-slate-200/80">
                      <h1 className="text-lg font-black text-slate-800">{activeLecture.title}</h1>
                      <p className="text-slate-400 text-xs mt-2">مدة المحاضرة: {activeLecture.duration || "غير محدد"}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-500">
              <HelpCircle className="w-12 h-12 mx-auto mb-4 text-slate-350" />
              <span>لا توجد محاضرات في هذا الكورس بعد.</span>
            </div>
          )}
        </div>

        {/* Right Area (4 cols): Course Curriculum Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4 text-right">
            <h2 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">منهج المحاضرات</h2>

            <div className="space-y-6">
              {course.chapters.map((chapter) => {
                const chapterQuiz = chapter.quizzes[0];
                const quizPassed = chapterQuiz ? isQuizPassed(chapterQuiz.id, chapterQuiz.passingScore) : true;

                return (
                  <div key={chapter.id} className="space-y-3">
                    {/* Chapter Header */}
                    <div className="p-3 bg-physicsNavy-50 border border-physicsNavy-100/50 rounded-xl">
                      <h3 className="font-bold text-physicsNavy-900 text-xs">
                        {chapter.title}
                      </h3>
                    </div>

                    {/* Chapter Contents */}
                    <div className="mr-2 border-r border-slate-200/80 pr-3 space-y-2">
                      {chapter.lectures.map((lecture, lIdx) => {
                        const isLectureLocked = chapterQuiz && chapterQuiz.isMandatory && lIdx > 0 && !quizPassed;
                        const isActive = activeLecture?.id === lecture.id;

                        return (
                          <div key={lecture.id}>
                            {isLectureLocked ? (
                              <div className="flex items-center justify-between text-xs text-slate-400 py-1.5 cursor-not-allowed">
                                <span className="flex items-center gap-2">
                                  <Lock className="w-4 h-4 text-slate-300" />
                                  <span>{lecture.title}</span>
                                </span>
                              </div>
                            ) : (
                              <Link
                                href={`/student/course/${courseId}?lectureId=${lecture.id}`}
                                className={`flex items-center justify-between text-xs py-1.5 hover:text-physicsCyan-600 transition ${
                                  isActive ? "text-physicsCyan-600 font-bold" : "text-slate-650"
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <Play className="w-4 h-4 shrink-0 text-physicsCyan-500" />
                                  <span className="line-clamp-1">{lecture.title}</span>
                                </span>
                                <span className="text-[10px] text-slate-400">{lecture.duration}</span>
                              </Link>
                            )}
                          </div>
                        );
                      })}

                      {/* Quizzes */}
                      {chapter.quizzes.map((q) => {
                        const passed = isQuizPassed(q.id, q.passingScore);
                        return (
                          <Link
                            key={q.id}
                            href={`/student/quiz/${q.id}`}
                            className="flex items-center justify-between text-xs py-1.5 border-t border-slate-100 mt-1 hover:text-physicsCyan-600 transition"
                          >
                            <span className="flex items-center gap-2">
                              <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0" />
                              <span className="font-semibold text-slate-700">امتحان: {q.title}</span>
                            </span>
                            {passed ? (
                              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] rounded-md font-bold flex items-center gap-0.5 shrink-0">
                                <CheckCircle className="w-3 h-3" />
                                مجتاز
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] rounded-md font-bold flex items-center gap-0.5 shrink-0">
                                <AlertTriangle className="w-3 h-3" />
                                لم يمر بعد
                              </span>
                            )}
                          </Link>
                        );
                      })}

                      {/* Homework PDFs */}
                      {chapter.homeworks.map((hw) => {
                        const isHwLocked = chapterQuiz && chapterQuiz.isMandatory && !quizPassed;
                        return (
                          <div key={hw.id} className="pt-1">
                            {isHwLocked ? (
                              <div className="flex items-center gap-2 text-xs text-slate-400 py-1.5 cursor-not-allowed">
                                <Lock className="w-4 h-4 text-slate-350" />
                                <span>تحميل: {hw.title}</span>
                              </div>
                            ) : (
                              <a
                                href={`/api/document/download?homeworkId=${hw.id}`}
                                download
                                className="flex items-center gap-2 text-xs text-slate-700 py-1.5 hover:text-physicsCyan-600 transition"
                              >
                                <FileText className="w-4 h-4 text-red-500" />
                                <span className="line-clamp-1">تحميل: {hw.title}</span>
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
