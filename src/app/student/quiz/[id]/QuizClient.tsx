"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MathText from "@/components/MathText";
import { Timer, AlertTriangle, CheckCircle2, XCircle, Award, ArrowRight, Loader2, HelpCircle } from "lucide-react";

interface Question {
  id: string;
  quizId: string;
  text: string;
  imageUrl: string | null;
  type: string; // MCQ, WRITTEN
  options: string | null; // JSON array string
  correctOption: number | null;
  explanation: string | null;
}

interface Quiz {
  id: string;
  title: string;
  duration: number; // in minutes
  passingScore: number;
  isMandatory: boolean;
  questions: Question[];
  chapter: {
    courseId: string;
    course: {
      title: string;
    };
  };
}

interface Attempt {
  id: string;
  score: number;
  answers: string; // JSON string
  submittedAt: Date | null;
}

interface QuizClientProps {
  quiz: Quiz;
  user: any;
  pastAttempts: Attempt[];
}

export default function QuizClient({ quiz, user, pastAttempts }: QuizClientProps) {
  const [gameState, setGameState] = useState<"OVERVIEW" | "PLAYING" | "REVIEW">("OVERVIEW");
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [timeLeft, setTimeLeft] = useState(quiz.duration * 60);
  const [loading, setLoading] = useState(false);
  const [activeReviewAttempt, setActiveReviewAttempt] = useState<Attempt | null>(null);
  const router = useRouter();

  // Active timer logic
  useEffect(() => {
    if (gameState !== "PLAYING") return;

    if (timeLeft <= 0) {
      // Auto submit when time runs out
      triggerSubmit();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, gameState]);

  // Format time (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleOptionChange = (questionId: string, optionIdx: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const handleWrittenChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: text }));
  };

  const startQuiz = () => {
    setAnswers({});
    setTimeLeft(quiz.duration * 60);
    setGameState("PLAYING");
  };

  const triggerSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/student/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: quiz.id,
          answers,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Trigger redirect or refresh to update pastAttempts, and show review of the new attempt
      router.refresh();
      // Emulate the attempt for instant feedback
      const mockAttempt: Attempt = {
        id: data.attemptId,
        score: data.score,
        answers: JSON.stringify(answers),
        submittedAt: new Date(),
      };
      setActiveReviewAttempt(mockAttempt);
      setGameState("REVIEW");
    } catch (e: any) {
      alert("حدث خطأ أثناء تسليم الاختبار: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const startReview = (attempt: Attempt) => {
    setActiveReviewAttempt(attempt);
    setAnswers(JSON.parse(attempt.answers));
    setGameState("REVIEW");
  };

  // Render overview dashboard (start screen)
  if (gameState === "OVERVIEW") {
    return (
      <div className="space-y-6 text-right">
        {/* Back Link */}
        <Link
          href={`/student/course/${quiz.chapter.courseId}`}
          className="inline-flex items-center gap-1 text-slate-500 hover:text-physicsCyan-600 text-sm transition"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة للكورس</span>
        </Link>

        {/* Header card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 space-y-4">
          <div className="flex justify-between items-start gap-4 flex-wrap">
            <div className="space-y-2">
              <span className="text-xs font-semibold px-2 py-0.5 bg-physicsCyan-50 text-physicsCyan-700 rounded-md">
                {quiz.chapter.course.title}
              </span>
              <h1 className="text-xl md:text-2xl font-black text-slate-800">{quiz.title}</h1>
            </div>
            <div className="flex gap-4">
              <div className="p-3 bg-slate-50 rounded-xl text-center min-w-[90px] border border-slate-100">
                <span className="text-slate-500 text-[10px] block">مدة الاختبار</span>
                <span className="font-bold text-slate-700 text-sm">{quiz.duration} دقيقة</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl text-center min-w-[90px] border border-slate-100">
                <span className="text-slate-500 text-[10px] block">درجة النجاح</span>
                <span className="font-bold text-slate-700 text-sm">%{quiz.passingScore}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={startQuiz}
              className="px-8 py-3 bg-physicsCyan-600 hover:bg-physicsCyan-500 text-white font-bold rounded-xl text-sm transition shadow-md shadow-physicsCyan-500/10"
            >
              بدء محاولة جديدة
            </button>
          </div>
        </div>

        {/* Past Attempts */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Award className="w-5 h-5 text-physicsCyan-600" />
            <span>محاولاتك السابقة</span>
          </h2>

          {pastAttempts.length === 0 ? (
            <p className="text-slate-400 text-xs py-2">لم تقم بحل هذا الاختبار من قبل.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {pastAttempts.map((attempt, index) => {
                const isPassed = attempt.score >= quiz.passingScore;
                const formattedDate = attempt.submittedAt
                  ? new Date(attempt.submittedAt).toLocaleDateString("ar-EG", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "تاريخ غير معروف";

                return (
                  <div key={attempt.id} className="py-3 flex justify-between items-center gap-4 text-xs">
                    <div>
                      <p className="font-bold text-slate-700">محاولة #{pastAttempts.length - index}</p>
                      <p className="text-slate-400 text-[10px] mt-0.5">{formattedDate}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-md ${
                          isPassed ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                        }`}
                      >
                        الدرجة: %{attempt.score}
                      </span>
                      <button
                        onClick={() => startReview(attempt)}
                        className="px-3 py-1.5 border border-slate-200 hover:border-physicsCyan-500 hover:text-physicsCyan-600 text-slate-600 rounded-lg transition font-medium"
                      >
                        مراجعة الإجابات
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render active testing mode
  if (gameState === "PLAYING") {
    return (
      <div className="space-y-6 text-right relative pb-20">
        {/* Floating Header with Timer */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 sticky top-16 z-30 shadow-md flex justify-between items-center border border-slate-800">
          <div className="space-y-1">
            <h2 className="font-bold text-xs md:text-sm">{quiz.title}</h2>
            <span className="text-[10px] text-slate-400">يرجى عدم تحديث الصفحة أثناء الامتحان</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 font-mono text-sm md:text-base font-extrabold text-amber-400">
            <Timer className="w-4 h-4 md:w-5 h-5 shrink-0 text-amber-400" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* Questions list */}
        <div className="space-y-6">
          {quiz.questions.map((question, qIdx) => {
            const questionOptions = question.options ? (JSON.parse(question.options) as string[]) : [];

            return (
              <div key={question.id} className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4">
                {/* Question Text */}
                <div className="flex gap-2">
                  <span className="font-black text-physicsNavy-700 text-sm md:text-base shrink-0">{qIdx + 1}.</span>
                  <div className="text-slate-800 text-sm md:text-base font-bold leading-relaxed">
                    <MathText text={question.text} />
                  </div>
                </div>

                {/* Question Image (Diagram) */}
                {question.imageUrl && (
                  <div className="max-w-md mx-auto py-2">
                    <img src={question.imageUrl} alt="Diagram" className="rounded-xl border border-slate-100 max-h-56 object-contain" />
                  </div>
                )}

                {/* Question inputs */}
                {question.type === "MCQ" ? (
                  <div className="grid sm:grid-cols-2 gap-3 mr-4">
                    {questionOptions.map((opt, oIdx) => {
                      const optLabel = ["أ", "ب", "ج", "د"][oIdx] || `${oIdx + 1}`;
                      const isSelected = answers[question.id] === oIdx;

                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => handleOptionChange(question.id, oIdx)}
                          className={`p-3 border rounded-xl flex items-center justify-between text-xs font-semibold text-right transition cursor-pointer ${
                            isSelected
                              ? "border-physicsCyan-500 bg-physicsCyan-50/30 text-physicsCyan-900"
                              : "border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold border text-[10px] shrink-0 ${
                                isSelected
                                  ? "bg-physicsCyan-500 border-physicsCyan-600 text-white"
                                  : "bg-white border-slate-200 text-slate-500"
                              }`}
                            >
                              {optLabel}
                            </span>
                            <MathText text={opt} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mr-4">
                    <textarea
                      value={(answers[question.id] as string) || ""}
                      onChange={(e) => handleWrittenChange(question.id, e.target.value)}
                      placeholder="اكتب إجابتك الفيزيائية بالتفصيل هنا..."
                      rows={4}
                      className="w-full border border-slate-200 focus:border-physicsCyan-500 rounded-xl p-3 outline-none text-xs text-slate-700 leading-relaxed text-right"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Submit Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 py-4 px-4 z-40">
          <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
            <button
              onClick={() => {
                if (confirm("هل أنت متأكد من تسليم الإجابات وإنهاء الاختبار؟")) {
                  triggerSubmit();
                }
              }}
              disabled={loading}
              className="px-8 py-3 bg-physicsCyan-600 hover:bg-physicsCyan-500 text-white font-bold rounded-xl text-sm flex items-center gap-2 transition disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري تسليم وتصحيح الإجابات...</span>
                </>
              ) : (
                <span>إنهاء وتسليم الاختبار</span>
              )}
            </button>
            <span className="text-[10px] md:text-xs text-slate-500 font-medium">
              تم الإجابة على {Object.keys(answers).length} من أصل {quiz.questions.length} سؤال
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Render review mode
  if (gameState === "REVIEW" && activeReviewAttempt) {
    const isPassed = activeReviewAttempt.score >= quiz.passingScore;
    const studentAnswers = JSON.parse(activeReviewAttempt.answers);

    return (
      <div className="space-y-6 text-right">
        {/* Navigation back */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setGameState("OVERVIEW")}
            className="inline-flex items-center gap-1 text-slate-500 hover:text-physicsCyan-600 text-xs transition"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لصفحة الاختبار الرئيسية</span>
          </button>
          <Link
            href={`/student/course/${quiz.chapter.courseId}`}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
          >
            استكمال الكورس
          </Link>
        </div>

        {/* Score Overview Board */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm">
          <div className="space-y-3 text-center md:text-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              مراجعة نتائج المحاولة
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-800">{quiz.title}</h1>
            <p className="text-xs text-slate-400">
              درجة النجاح المطلوبة: %{quiz.passingScore} في الأسئلة الموضوعية (الـ MCQ)
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <span className="text-[10px] text-slate-400 block mb-1">النتيجة المحققة</span>
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center text-xl font-black border-4 ${
                  isPassed
                    ? "bg-emerald-50 border-emerald-500 text-emerald-600"
                    : "bg-red-50 border-red-500 text-red-600"
                }`}
              >
                %{activeReviewAttempt.score}
              </div>
            </div>
            <div>
              {isPassed ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200/50 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <p>مبروك! لقد اجتزت الاختبار بنجاح</p>
                    <p className="text-[10px] text-emerald-600 mt-0.5">تم تفعيل المحاضرات التالية بنجاح</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-red-50 border border-red-200/50 rounded-2xl flex items-center gap-2 text-red-800 text-xs font-bold">
                  <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <div>
                    <p>لم تجتز درجة النجاح المطلوبة</p>
                    <p className="text-[10px] text-red-650 mt-0.5">حاول مرة أخرى لتحسين مستواك وفتح المحاضرات</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Questions Review */}
        <div className="space-y-6">
          <h2 className="font-bold text-slate-800 text-sm">تفاصيل الأسئلة والإجابات النموذجية:</h2>

          {quiz.questions.map((question, qIdx) => {
            const questionOptions = question.options ? (JSON.parse(question.options) as string[]) : [];
            const studentAns = studentAnswers[question.id];

            return (
              <div key={question.id} className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4">
                {/* Question title */}
                <div className="flex gap-2">
                  <span className="font-black text-physicsNavy-700 text-sm shrink-0">{qIdx + 1}.</span>
                  <div className="text-slate-800 text-sm font-bold leading-relaxed">
                    <MathText text={question.text} />
                  </div>
                </div>

                {/* Question Image */}
                {question.imageUrl && (
                  <div className="max-w-md mx-auto py-2">
                    <img src={question.imageUrl} alt="Diagram" className="rounded-xl border border-slate-100 max-h-56 object-contain" />
                  </div>
                )}

                {/* Options / Answers view */}
                {question.type === "MCQ" ? (
                  <div className="grid sm:grid-cols-2 gap-3 mr-4">
                    {questionOptions.map((opt, oIdx) => {
                      const optLabel = ["أ", "ب", "ج", "د"][oIdx] || `${oIdx + 1}`;
                      const isCorrectOpt = oIdx === question.correctOption;
                      const isStudentChoice = studentAns !== undefined && Number(studentAns) === oIdx;

                      let cardStyle = "border-slate-200 text-slate-650 bg-slate-50/50";
                      let badgeIcon = null;

                      if (isCorrectOpt) {
                        cardStyle = "border-emerald-500 bg-emerald-50/30 text-emerald-900";
                        badgeIcon = <span className="text-[10px] text-emerald-600 font-bold">(الإجابة الصحيحة)</span>;
                      } else if (isStudentChoice) {
                        cardStyle = "border-red-500 bg-red-50/30 text-red-900";
                        badgeIcon = <span className="text-[10px] text-red-650 font-bold">(إجابتك الخطأ)</span>;
                      }

                      return (
                        <div
                          key={oIdx}
                          className={`p-3 border rounded-xl flex items-center justify-between text-xs font-semibold text-right transition ${cardStyle}`}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold border text-[10px] shrink-0 ${
                                isCorrectOpt
                                  ? "bg-emerald-500 border-emerald-600 text-white"
                                  : isStudentChoice
                                  ? "bg-red-500 border-red-600 text-white"
                                  : "bg-white border-slate-200 text-slate-500"
                              }`}
                            >
                              {optLabel}
                            </span>
                            <MathText text={opt} />
                          </span>
                          {badgeIcon}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mr-4 space-y-2">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <p className="text-[10px] text-slate-400 font-medium mb-1">إجابتك المكتوبة:</p>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        {studentAns || "(لم تقم بكتابة أي إجابة لهذا السؤال)"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Explanation text */}
                {question.explanation && (
                  <div className="bg-physicsCyan-50/20 border border-physicsCyan-100/50 rounded-xl p-4 mr-4 mt-2">
                    <div className="flex items-center gap-1.5 mb-1.5 text-physicsCyan-800 text-xs font-bold">
                      <HelpCircle className="w-4 h-4 text-physicsCyan-600 shrink-0" />
                      <span>التفسير والحل العلمي:</span>
                    </div>
                    <div className="text-xs text-slate-650 leading-relaxed font-medium">
                      <MathText text={question.explanation} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
