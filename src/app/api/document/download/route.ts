import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    // 1. Verify User Authentication
    const user = await getAuthUser();
    if (!user) {
      return new NextResponse("غير مصرح: يرجى تسجيل الدخول أولاً", { status: 401 });
    }

    // 2. Extract homeworkId from query
    const homeworkId = request.nextUrl.searchParams.get("homeworkId");
    if (!homeworkId) {
      return new NextResponse("معرف ملف الواجب مطلوب", { status: 400 });
    }

    // 3. Find Homework in Database with Chapter and Course
    const homework = await db.homework.findUnique({
      where: { id: homeworkId },
      include: {
        chapter: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!homework) {
      return new NextResponse("الملف غير موجود", { status: 404 });
    }

    // 4. Verify Student Enrollment (Admins have full access)
    if (user.role === "STUDENT") {
      const enrollment = await db.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId: homework.chapter.courseId,
          },
        },
      });

      if (!enrollment) {
        return new NextResponse("غير مصرح: يجب تفعيل واشتراك الكورس أولاً لتحميل الملف", {
          status: 403,
        });
      }
    }

    // 5. Locate File on Disk
    let pdfPath = "";
    if (homework.pdfUrl.startsWith("/uploads/")) {
      pdfPath = path.join(process.cwd(), "public", homework.pdfUrl.replace(/^\//, ""));
    } else if (homework.pdfUrl.startsWith("http://") || homework.pdfUrl.startsWith("https://")) {
      return NextResponse.redirect(homework.pdfUrl);
    } else {
      pdfPath = path.join(process.cwd(), "public", "uploads", "documents", homework.pdfUrl);
    }
    // Path Traversal Security Check
    const normalizedPdfPath = path.normalize(pdfPath);
    if (!normalizedPdfPath.startsWith(process.cwd())) {
      return new NextResponse("طلب غير مصرح به", { status: 403 });
    }

    if (!fs.existsSync(normalizedPdfPath)) {
      return new NextResponse("ملف الواجب غير موجود على الخادم", { status: 404 });
    }

    // 6. Read and Stream File with Attachment Headers
    const fileBuffer = await fs.promises.readFile(normalizedPdfPath);
    const safeFilename = encodeURIComponent(homework.title || "homework") + ".pdf";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error: any) {
    console.error("Document download error:", error);
    return new NextResponse("حدث خطأ أثناء تحميل الملف", { status: 500 });
  }
}
