import React from "react";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { BookOpen, Plus, Play, FileText, ChevronLeft, FolderPlus, Film, FilePlus } from "lucide-react";

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

  // Server Actions
  async function createCourseAction(formData: FormData) {
    "use server";
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const image = formData.get("image") as string;
    const grade = formData.get("grade") as string;

    if (title && grade) {
      await db.course.create({
        data: {
          title,
          description,
          image: image || "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=600&auto=format&fit=crop",
          grade,
          isPublished: true,
        },
      });
      revalidatePath("/admin/courses");
    }
  }

  async function createChapterAction(formData: FormData) {
    "use server";
    const title = formData.get("title") as string;
    const orderStr = formData.get("order") as string;
    const courseId = formData.get("courseId") as string;

    if (title && courseId) {
      await db.chapter.create({
        data: {
          title,
          order: parseInt(orderStr) || 1,
          courseId,
        },
      });
      revalidatePath(`/admin/courses?courseId=${courseId}`);
    }
  }

  async function createLectureAction(formData: FormData) {
    "use server";
    const title = formData.get("title") as string;
    const videoUrl = formData.get("videoUrl") as string;
    const duration = formData.get("duration") as string;
    const orderStr = formData.get("order") as string;
    const chapterId = formData.get("chapterId") as string;
    const courseId = formData.get("courseId") as string;

    if (title && videoUrl && chapterId) {
      await db.lecture.create({
        data: {
          title,
          videoUrl,
          duration: duration || "00:00",
          order: parseInt(orderStr) || 1,
          chapterId,
        },
      });
      revalidatePath(`/admin/courses?courseId=${courseId}`);
    }
  }

  async function createHomeworkAction(formData: FormData) {
    "use server";
    const title = formData.get("title") as string;
    const pdfUrl = formData.get("pdfUrl") as string;
    const chapterId = formData.get("chapterId") as string;
    const courseId = formData.get("courseId") as string;

    if (title && pdfUrl && chapterId) {
      await db.homework.create({
        data: {
          title,
          pdfUrl,
          chapterId,
        },
      });
      revalidatePath(`/admin/courses?courseId=${courseId}`);
    }
  }

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

            <form action={createCourseAction} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-650 mb-1">اسم الكورس</label>
                <input
                  type="text"
                  name="title"
                  placeholder="مثال: التيار المتردد والفيزياء الحديثة"
                  className="w-full px-3 py-2 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none text-right"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-650 mb-1">وصف تفصيلي</label>
                <textarea
                  name="description"
                  placeholder="اكتب وصفاً موجزاً لمحتويات هذا الكورس الدراسي..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none text-right"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-650 mb-1">الصف الدراسي</label>
                  <select
                    name="grade"
                    className="w-full px-3 py-2 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none cursor-pointer"
                    required
                  >
                    <option value="1">الأول الثانوي</option>
                    <option value="2">الثاني الثانوي</option>
                    <option value="3">الثالث الثانوي</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-650 mb-1">رابط صورة الغلاف</label>
                  <input
                    type="text"
                    name="image"
                    placeholder="رابط الصورة (اختياري)"
                    className="w-full px-3 py-2 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none text-left font-mono text-[10px]"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-physicsCyan-600 hover:bg-physicsCyan-500 text-white font-bold rounded-lg transition"
              >
                إنشاء الكورس
              </button>
            </form>
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
              <div className="bg-physicsNavy-900 text-white p-6 rounded-2xl shadow-sm border border-physicsNavy-800">
                <span className="text-[10px] font-bold text-physicsCyan-400 uppercase tracking-wider block mb-1">
                  {getGradeName(selectedCourse.grade)}
                </span>
                <h2 className="text-lg font-black">{selectedCourse.title}</h2>
              </div>

              {/* Add Chapter Form */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-physicsCyan-600" />
                  <span>إضافة فصل جديد للكورس</span>
                </h3>
                <form action={createChapterAction} className="flex gap-3 text-xs">
                  <input type="hidden" name="courseId" value={selectedCourse.id} />
                  <div className="flex-1">
                    <input
                      type="text"
                      name="title"
                      placeholder="عنوان الفصل (مثال: الفصل الثاني: التأثير المغناطيسي للتيار)"
                      className="w-full px-3 py-2.5 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none text-right"
                      required
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      name="order"
                      placeholder="الترتيب"
                      defaultValue={selectedCourse.chapters.length + 1}
                      className="w-full px-3 py-2.5 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none text-center"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-physicsCyan-600 hover:bg-physicsCyan-500 text-white font-bold rounded-lg transition shrink-0"
                  >
                    إضافة فصل
                  </button>
                </form>
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
                                  <span className="font-mono text-slate-400">{lec.duration}</span>
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
                                <div key={hw.id} className="flex items-center gap-1.5 py-1 text-slate-650">
                                  <FileText className="w-3.5 h-3.5 text-red-500" />
                                  <span className="font-semibold text-slate-750">{hw.title}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Content Creator Forms for this Chapter */}
                      <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
                        {/* Add Lecture form */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
                          <h5 className="font-bold text-slate-800 text-[11px]">إضافة محاضرة مرئية</h5>
                          <form action={createLectureAction} className="space-y-2">
                            <input type="hidden" name="courseId" value={selectedCourse.id} />
                            <input type="hidden" name="chapterId" value={chapter.id} />
                            <input
                              type="text"
                              name="title"
                              placeholder="عنوان المحاضرة"
                              className="w-full px-2 py-1.5 border border-slate-200 focus:border-physicsCyan-500 rounded outline-none text-right"
                              required
                            />
                            <input
                              type="text"
                              name="videoUrl"
                              placeholder="رابط الفيديو (YouTube/Vimeo)"
                              className="w-full px-2 py-1.5 border border-slate-200 focus:border-physicsCyan-500 rounded outline-none text-left font-mono text-[10px]"
                              required
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                name="duration"
                                placeholder="المدة (مثال: 45:00)"
                                className="w-full px-2 py-1.5 border border-slate-200 focus:border-physicsCyan-500 rounded outline-none text-center"
                              />
                              <input
                                type="number"
                                name="order"
                                placeholder="الترتيب"
                                defaultValue={chapter.lectures.length + 1}
                                className="w-full px-2 py-1.5 border border-slate-200 focus:border-physicsCyan-500 rounded outline-none text-center"
                              />
                            </div>
                            <button
                              type="submit"
                              className="w-full py-1.5 bg-physicsNavy-700 hover:bg-physicsNavy-800 text-white font-bold rounded transition text-[10px]"
                            >
                              إضافة المحاضرة
                            </button>
                          </form>
                        </div>

                        {/* Add Homework PDF form */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
                          <h5 className="font-bold text-slate-800 text-[11px]">إضافة ملف ملخص / واجب PDF</h5>
                          <form action={createHomeworkAction} className="space-y-2">
                            <input type="hidden" name="courseId" value={selectedCourse.id} />
                            <input type="hidden" name="chapterId" value={chapter.id} />
                            <input
                              type="text"
                              name="title"
                              placeholder="عنوان ملف الواجب"
                              className="w-full px-2 py-1.5 border border-slate-200 focus:border-physicsCyan-500 rounded outline-none text-right"
                              required
                            />
                            <input
                              type="text"
                              name="pdfUrl"
                              placeholder="رابط تحميل ملف الـ PDF"
                              className="w-full px-2 py-1.5 border border-slate-200 focus:border-physicsCyan-500 rounded outline-none text-left font-mono text-[10px]"
                              required
                            />
                            <button
                              type="submit"
                              className="w-full py-1.5 bg-physicsNavy-700 hover:bg-physicsNavy-800 text-white font-bold rounded transition text-[10px]"
                            >
                              إضافة الملف
                            </button>
                          </form>
                        </div>
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
