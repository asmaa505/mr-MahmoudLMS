import React from "react";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { BookOpen, Plus, Play, FileText, ChevronLeft, FolderPlus, Film, FilePlus } from "lucide-react";
import CourseHeaderActions, { DeleteChapterButton, DeleteLectureButton, DeleteHomeworkButton } from "./CourseHeaderActions";
import {
  CreateCourseForm,
  AddChapterForm,
  AddLectureForm,
  AddHomeworkForm,
} from "./CourseCreationForms";

interface CoursesPageProps {
  searchParams: Promise<{ courseId?: string }>;
}

export default async function AdminCoursesPage({ searchParams }: CoursesPageProps) {
  const resolvedSearchParams = await searchParams;
  const selectedCourseId = resolvedSearchParams.courseId;

  // Fetch all courses
  const courses = await db.course.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Fetch chapters for selected course if any
  const selectedCourse = selectedCourseId
    ? await db.course.findUnique({
        where: { id: selectedCourseId },
        include: {
          chapters: {
            orderBy: { order: "asc" },
            include: {
              lectures: { orderBy: { order: "asc" } },
              homeworks: true,
            },
          },
        },
      })
    : null;

  const getGradeName = (g: string) => {
    if (g === "1") return "الصف الأول الثانوي";
    if (g === "2") return "الصف الثاني الثانوي";
    return "الصف الثالث الثانوي";
  };

  return (
    <div className="space-y-8 text-right">
      <div>
        <h1 className="text-xl md:text-2xl font-black text-slate-800">إدارة المنهج والدروس</h1>
        <p className="text-xs text-slate-500 mt-1">إنشاء الكورسات، تقسيمها إلى فصول، وإضافة المحاضرات والواجبات المنزلية.</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (5 cols): Course List & Creator */}
        <div className="lg:col-span-5 space-y-6">
          {/* Create Course Form */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
              <Plus className="w-5 h-5 text-physicsCyan-600" />
              <span>إضافة كورس جديد</span>
            </h2>

            <CreateCourseForm />
          </div>

          {/* Courses List */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
              <BookOpen className="w-5 h-5 text-physicsCyan-600" />
              <span>قائمة الكورسات الحالية</span>
            </h2>

            {courses.length === 0 ? (
              <p className="text-slate-400 text-xs py-4 text-center">لا توجد كورسات مضافة بعد.</p>
            ) : (
              <div className="space-y-3">
                {courses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/admin/courses?courseId=${course.id}`}
                    className={`block p-4 border rounded-xl hover:border-physicsCyan-500/50 transition text-right ${
                      selectedCourseId === course.id
                        ? "border-physicsCyan-500 bg-physicsCyan-50/10"
                        : "border-slate-150"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1.5 flex-1">
                        <span className="text-[10px] font-bold text-physicsCyan-600 px-1.5 py-0.5 bg-physicsCyan-50 rounded-md">
                          {getGradeName(course.grade)}
                        </span>
                        <h3 className="font-bold text-slate-800 text-xs leading-snug">{course.title}</h3>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (7 cols): Selected Course Chapters & Content Editor */}
        <div className="lg:col-span-7 space-y-6">
          {selectedCourse ? (
            <div className="space-y-6">
              {/* Course Header Info */}
              <div className="bg-physicsNavy-900 text-white p-6 rounded-2xl shadow-sm border border-physicsNavy-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-[10px] font-bold text-physicsCyan-400 uppercase tracking-wider block mb-1">
                    {getGradeName(selectedCourse.grade)}
                  </span>
                  <h2 className="text-lg font-black">{selectedCourse.title}</h2>
                  {selectedCourse.description && (
                    <p className="text-physicsNavy-200 text-xs mt-1 max-w-lg leading-relaxed">
                      {selectedCourse.description}
                    </p>
                  )}
                </div>
                <CourseHeaderActions course={selectedCourse} />
              </div>

              {/* Add Chapter Form */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-physicsCyan-600" />
                  <span>إضافة فصل جديد للكورس</span>
                </h3>
                <AddChapterForm
                  courseId={selectedCourse.id}
                  defaultOrder={selectedCourse.chapters.length + 1}
                />
              </div>

              {/* Chapters list and contents */}
              {selectedCourse.chapters.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-500 text-xs">
                  لم يتم إضافة أي فصول لهذا الكورس الدراسي بعد.
                </div>
              ) : (
                <div className="space-y-6">
                  {selectedCourse.chapters.map((chapter) => (
                    <div
                      key={chapter.id}
                      className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5"
                    >
                      {/* Chapter Title banner */}
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800">
                          {chapter.title} (الترتيب: {chapter.order})
                        </span>
                        <DeleteChapterButton chapterId={chapter.id} courseId={selectedCourse.id} />
                      </div>

                      {/* Lectures & Homework lists inside Chapter */}
                      <div className="mr-3 border-r-2 border-slate-100 pr-4 space-y-3">
                        {/* Lectures */}
                        <div className="space-y-1.5">
                          <h4 className="font-bold text-slate-700 text-xs flex items-center gap-1.5 mb-2">
                            <Film className="w-4 h-4 text-physicsCyan-500" />
                            المحاضرات المرئية:
                          </h4>
                          {chapter.lectures.length === 0 ? (
                            <p className="text-[10px] text-slate-400">لا توجد محاضرات في هذا الفصل.</p>
                          ) : (
                            <div className="space-y-1 mr-2 text-[11px]">
                              {chapter.lectures.map((lec) => (
                                <div key={lec.id} className="flex justify-between items-center py-1 border-b border-dashed border-slate-100 text-slate-650">
                                  <span className="flex items-center gap-1.5">
                                    <Play className="w-3.5 h-3.5 text-physicsCyan-500" />
                                    <span className="font-semibold text-slate-750">{lec.title}</span>
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-slate-400 text-[10px]">{lec.duration}</span>
                                    <DeleteLectureButton lectureId={lec.id} courseId={selectedCourse.id} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Homework PDFs */}
                        <div className="space-y-1.5 pt-3">
                          <h4 className="font-bold text-slate-700 text-xs flex items-center gap-1.5 mb-2">
                            <FilePlus className="w-4 h-4 text-red-400" />
                            ملفات الواجب والملخصات:
                          </h4>
                          {chapter.homeworks.length === 0 ? (
                            <p className="text-[10px] text-slate-400">لا توجد ملفات واجب في هذا الفصل.</p>
                          ) : (
                            <div className="space-y-1 mr-2 text-[11px]">
                              {chapter.homeworks.map((hw) => (
                                <div key={hw.id} className="flex justify-between items-center py-1 text-slate-650">
                                  <div className="flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-red-500" />
                                    <span className="font-semibold text-slate-750">{hw.title}</span>
                                  </div>
                                  <DeleteHomeworkButton homeworkId={hw.id} courseId={selectedCourse.id} />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Content Creator Forms for this Chapter */}
                      <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
                        <AddLectureForm
                          courseId={selectedCourse.id}
                          chapterId={chapter.id}
                          defaultOrder={chapter.lectures.length + 1}
                        />

                        <AddHomeworkForm
                          courseId={selectedCourse.id}
                          chapterId={chapter.id}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400 text-xs">
              الرجاء تحديد كورس من القائمة الجانبية لإدارة الفصول والمحاضرات.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
