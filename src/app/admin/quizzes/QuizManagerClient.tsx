"use client";

import React, { useState } from "react";
import MathText from "@/components/MathText";
import { Plus, HelpCircle, Eye, Loader2, BookOpenCheck, Settings2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import MediaUploadInput from "@/components/MediaUploadInput";

interface Question {
  id: string;
  quizId: string;
  text: string;
  imageUrl: string | null;
  type: string;
  options: string | null;
  correctOption: number | null;
  explanation: string | null;
}

interface Quiz {
  id: string;
  title: string;
  duration: number;
  passingScore: number;
  isMandatory: boolean;
  questions: Question[];
  chapter: {
    title: string;
    course: {
      title: string;
    };
  };
}

interface QuizManagerClientProps {
  chapters: any[];
  initialQuizzes: Quiz[];
}

export default function QuizManagerClient({ chapters, initialQuizzes }: QuizManagerClientProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>(initialQuizzes);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(
    initialQuizzes.length > 0 ? initialQuizzes[0].id : null
  );

  // Quiz Form states
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDuration, setQuizDuration] = useState("15");
  const [quizPassing, setQuizPassing] = useState("50");
  const [quizMandatory, setQuizMandatory] = useState(true);
  const [quizChapterId, setQuizChapterId] = useState(chapters.length > 0 ? chapters[0].id : "");
  const [quizLoading, setQuizLoading] = useState(false);

  // Question Form states
  const [qText, setQText] = useState("");
  const [qImageUrl, setQImageUrl] = useState("");
  const [qType, setQType] = useState("MCQ"); // MCQ, WRITTEN
  const [qOptions, setQOptions] = useState(["", "", "", ""]);
  const [qCorrect, setQCorrect] = useState(0);
  const [qExplanation, setQExplanation] = useState("");
  const [qLoading, setQLoading] = useState(false);

  const router = useRouter();

  const selectedQuiz = quizzes.find((q) => q.id === selectedQuizId);

  // Handle quiz submission
  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuizLoading(true);

    try {
      const res = await fetch("/api/admin/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quizTitle,
          duration: quizDuration,
          passingScore: quizPassing,
          isMandatory: quizMandatory,
          chapterId: quizChapterId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setQuizzes((prev) => [data.quiz, ...prev]);
      setSelectedQuizId(data.quiz.id);
      setQuizTitle("");
      router.refresh();
    } catch (e: any) {
      alert("خطأ أثناء إنشاء الاختبار: " + e.message);
    } finally {
      setQuizLoading(false);
    }
  };

  // Handle question submission
  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuizId) return;
    setQLoading(true);

    try {
      const body = {
        quizId: selectedQuizId,
        text: qText,
        imageUrl: qImageUrl,
        type: qType,
        options: qType === "MCQ" ? qOptions : null,
        correctOption: qType === "MCQ" ? qCorrect : null,
        explanation: qExplanation,
      };

      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Append new question locally
      setQuizzes((prev) =>
        prev.map((q) => {
          if (q.id === selectedQuizId) {
            return {
              ...q,
              questions: [...q.questions, data.question],
            };
          }
          return q;
        })
      );

      // Reset question fields
      setQText("");
      setQImageUrl("");
      setQOptions(["", "", "", ""]);
      setQCorrect(0);
      setQExplanation("");
      router.refresh();
    } catch (e: any) {
      alert("خطأ أثناء إضافة السؤال: " + e.message);
    } finally {
      setQLoading(false);
    }
  };

  return (
    <div className="space-y-8 text-right">
      <div>
        <h1 className="text-xl md:text-2xl font-black text-slate-800">صانع ومنشئ الاختبارات</h1>
        <p className="text-xs text-slate-500 mt-1">
          قم بإنشاء اختبارات ذكية وربطها بالفصول وإعداد الأسئلة الرياضية والفيزيائية مع معاينة فورية لرموز ومعادلات الـ LaTeX.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (5 cols): Quiz creator and Quiz selector list */}
        <div className="lg:col-span-5 space-y-6">
          {/* Create Quiz card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
              <Plus className="w-5 h-5 text-physicsCyan-600 animate-pulse" />
              <span>إنشاء اختبار جديد</span>
            </h2>

            {chapters.length === 0 ? (
              <p className="text-[10px] text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100 leading-relaxed">
                الرجاء إنشاء كورس وفصل دراسي أولاً من صفحة إدارة الكورسات لتتمكن من إنشاء اختبارات.
              </p>
            ) : (
              <form onSubmit={handleCreateQuiz} className="space-y-3 text-xs leading-relaxed">
                <div>
                  <label className="block font-semibold text-slate-650 mb-1">اربط الفصل</label>
                  <select
                    value={quizChapterId}
                    onChange={(e) => setQuizChapterId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none cursor-pointer"
                    required
                  >
                    {chapters.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        [{ch.course.title}] - {ch.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-650 mb-1">اسم الاختبار</label>
                  <input
                    type="text"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    placeholder="مثال: اختبار شامل على الفصل الأول"
                    className="w-full px-3 py-2 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none text-right"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-650 mb-1">مدة الاختبار (بالدقائق)</label>
                    <input
                      type="number"
                      value={quizDuration}
                      onChange={(e) => setQuizDuration(e.target.value)}
                      placeholder="15"
                      className="w-full px-3 py-2 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none text-center"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-650 mb-1">درجة النجاح (%)</label>
                    <input
                      type="number"
                      value={quizPassing}
                      onChange={(e) => setQuizPassing(e.target.value)}
                      placeholder="50"
                      className="w-full px-3 py-2 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none text-center"
                      required
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isMandatory"
                    checked={quizMandatory}
                    onChange={(e) => setQuizMandatory(e.target.checked)}
                    className="w-4 h-4 cursor-pointer accent-physicsCyan-500"
                  />
                  <label htmlFor="isMandatory" className="font-semibold text-slate-700 cursor-pointer select-none">
                    اختبار إلزامي لفتح الدروس التالية
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={quizLoading}
                  className="w-full py-2.5 bg-physicsCyan-600 hover:bg-physicsCyan-500 text-white font-bold rounded-lg transition flex justify-center items-center gap-1.5"
                >
                  {quizLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>إنشاء الاختبار</span>}
                </button>
              </form>
            )}
          </div>

          {/* Quizzes List */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
              <BookOpenCheck className="w-5 h-5 text-physicsCyan-600" />
              <span>الاختبارات الحالية</span>
            </h2>

            {quizzes.length === 0 ? (
              <p className="text-slate-400 text-xs py-4 text-center">لا توجد اختبارات منشأة بعد.</p>
            ) : (
              <div className="space-y-3">
                {quizzes.map((quiz) => (
                  <button
                    key={quiz.id}
                    onClick={() => setSelectedQuizId(quiz.id)}
                    className={`w-full p-4 border rounded-xl hover:border-physicsCyan-500/50 transition text-right flex flex-col gap-1.5 ${
                      selectedQuizId === quiz.id
                        ? "border-physicsCyan-500 bg-physicsCyan-50/10"
                        : "border-slate-150"
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[10px] font-bold text-indigo-600 px-2 py-0.5 bg-indigo-50 rounded-md">
                        {quiz.chapter.course.title}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {quiz.questions.length} أسئلة
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-xs">{quiz.title}</h3>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (7 cols): Selected Quiz Editor */}
        <div className="lg:col-span-7 space-y-6">
          {selectedQuiz ? (
            <div className="space-y-6">
              {/* Quiz General Settings Display */}
              <div className="bg-physicsNavy-900 text-white p-6 rounded-2xl shadow-sm border border-physicsNavy-800 flex justify-between items-center flex-wrap gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-physicsCyan-400 font-bold">
                    {selectedQuiz.chapter.title}
                  </span>
                  <h2 className="text-lg font-black">{selectedQuiz.title}</h2>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                    المدة: {selectedQuiz.duration} د
                  </span>
                  <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                    النجاح: %{selectedQuiz.passingScore}
                  </span>
                </div>
              </div>

              {/* Add Question to Quiz form */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Plus className="w-4 h-4 text-physicsCyan-600" />
                  <span>إضافة سؤال للاختبار</span>
                </h3>

                <form onSubmit={handleCreateQuestion} className="space-y-4 text-xs leading-relaxed">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-650 mb-1">نوع السؤال</label>
                      <select
                        value={qType}
                        onChange={(e) => setQType(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none cursor-pointer"
                        required
                      >
                        <option value="MCQ">اختيار من متعدد (MCQ)</option>
                        <option value="WRITTEN">سؤال كتابي ومقالي</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <MediaUploadInput
                      mediaType="image"
                      label="صورة توضيحية للمسألة "
                      value={qImageUrl}
                      onChange={(url) => setQImageUrl(url)}
                      placeholder="أدخل رابط صورة المسألة أو ارفعها من جهازك (اختياري)"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-650 mb-1">
                      نص السؤال 
                    </label>
                    <textarea
                      value={qText}
                      onChange={(e) => setQText(e.target.value)}
                      placeholder="اكتب السؤال هنا... استخدم الرمز $ للمعادلات المدمجة والـ $$ للمعادلات الكبيرة"
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none text-right"
                      required
                    />
                  </div>

                  {/* Options (MCQ only) */}
                  {qType === "MCQ" && (
                    <div className="space-y-3 p-4 bg-slate-50 border border-slate-150 rounded-xl">
                      <h4 className="font-bold text-slate-800 text-[11px] mb-2">خيارات الإجابة والرمز الصحيح</h4>
                      {qOptions.map((opt, idx) => {
                        const label = ["أ", "ب", "ج", "د"][idx] || `${idx + 1}`;
                        return (
                          <div key={idx} className="flex gap-3 items-center">
                            <input
                              type="radio"
                              name="correctOption"
                              checked={qCorrect === idx}
                              onChange={() => setQCorrect(idx)}
                              className="w-4 h-4 cursor-pointer accent-physicsCyan-500"
                            />
                            <span className="font-bold text-slate-550 shrink-0">{label}.</span>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...qOptions];
                                newOpts[idx] = e.target.value;
                                setQOptions(newOpts);
                              }}
                              placeholder={`الخيار ${label}`}
                              className="flex-1 px-3 py-1.5 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none text-right bg-white"
                              required={qType === "MCQ"}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-slate-650 mb-1">
                      شرح وتفسير الإجابة (سيظهر للطالب كإجابة نموذجية بعد إنهاء الامتحان)
                    </label>
                    <textarea
                      value={qExplanation}
                      onChange={(e) => setQExplanation(e.target.value)}
                      placeholder="اكتب التفسير العلمي والفيزيائي للحل هنا..."
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none text-right"
                    />
                  </div>

                  {/* Live Preview Box */}
                  {(qText || qExplanation) && (
                    <div className="bg-physicsCyan-50/10 border border-physicsCyan-500/20 rounded-xl p-4 space-y-3">
                      <h4 className="font-bold text-physicsCyan-800 text-[10px] flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        معاينة مباشرة للمعادلات والرموز (Live LaTeX Preview)
                      </h4>
                      {qText && (
                        <div className="p-3 bg-white rounded-lg border border-slate-100">
                          <p className="text-[9px] text-slate-400 font-bold mb-1">السؤال:</p>
                          <div className="text-slate-800 leading-relaxed font-semibold text-[11px]">
                            <MathText text={qText} />
                          </div>
                        </div>
                      )}
                      {qExplanation && (
                        <div className="p-3 bg-white rounded-lg border border-slate-100">
                          <p className="text-[9px] text-slate-400 font-bold mb-1">التفسير والحل:</p>
                          <div className="text-slate-650 leading-relaxed text-[11px]">
                            <MathText text={qExplanation} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={qLoading}
                    className="w-full py-2.5 bg-physicsCyan-600 hover:bg-physicsCyan-500 text-white font-bold rounded-lg transition flex justify-center items-center gap-1.5"
                  >
                    {qLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>إضافة السؤال</span>}
                  </button>
                </form>
              </div>

              {/* Selected Quiz Questions List */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800 text-xs border-b border-slate-100 pb-3">
                  الأسئلة الحالية بالاختبار ({selectedQuiz.questions.length})
                </h3>

                {selectedQuiz.questions.length === 0 ? (
                  <p className="text-slate-400 text-xs py-4 text-center">لا توجد أسئلة مضافة بعد لهذا الاختبار.</p>
                ) : (
                  <div className="space-y-4">
                    {selectedQuiz.questions.map((question, index) => {
                      const qOpts = question.options ? (JSON.parse(question.options) as string[]) : [];

                      return (
                        <div key={question.id} className="p-4 border border-slate-150 rounded-xl text-xs space-y-2 text-right relative">
                          <div className="flex justify-between items-start gap-4">
                            <span className="font-bold text-physicsNavy-700 font-mono">سؤال #{index + 1} ({question.type})</span>
                          </div>
                          <div className="font-bold text-slate-800 mt-1">
                            <MathText text={question.text} />
                          </div>

                          {question.imageUrl && (
                            <img src={question.imageUrl} alt="Diagram" className="max-h-36 rounded-lg object-contain my-2 border border-slate-100" />
                          )}

                          {question.type === "MCQ" && (
                            <div className="grid sm:grid-cols-2 gap-2 mt-2 mr-2">
                              {qOpts.map((opt, oIdx) => {
                                const isCorrect = oIdx === question.correctOption;
                                return (
                                  <div
                                    key={oIdx}
                                    className={`p-2 border rounded-lg ${
                                      isCorrect
                                        ? "border-emerald-500 bg-emerald-50/20 text-emerald-950 font-bold"
                                        : "border-slate-100 text-slate-500 bg-slate-50/50"
                                    }`}
                                  >
                                    <span className="font-bold ml-1.5">{["أ", "ب", "ج", "د"][oIdx] || oIdx + 1}.</span>
                                    <MathText text={opt} />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-450 text-xs">
              الرجاء تحديد اختبار من القائمة الجانبية لإدارة الأسئلة وتعديلها.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
