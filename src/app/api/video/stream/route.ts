import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyVideoStreamToken } from "@/lib/video-security";
import fs from "fs";
import path from "path";

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".mp4":
      return "video/mp4";
    case ".m3u8":
      return "application/x-mpegURL";
    case ".ts":
      return "video/MP2T";
    case ".webm":
      return "video/webm";
    case ".ogg":
    case ".ogv":
      return "video/ogg";
    case ".mov":
      return "video/quicktime";
    case ".mkv":
      return "video/x-matroska";
    default:
      return "video/mp4";
  }
}

export async function GET(request: NextRequest) {
  try {
    const lectureId = request.nextUrl.searchParams.get("lectureId");
    const streamToken = request.nextUrl.searchParams.get("token");

    if (!lectureId) {
      return new NextResponse("معرف المحاضرة مطلوب", { status: 400 });
    }

    // 1. Anti-hotlinking / Anti-leeching check
    const referer = request.headers.get("referer");
    const host = request.headers.get("host");
    if (referer && host) {
      try {
        const refererUrl = new URL(referer);
        if (refererUrl.host !== host) {
          return new NextResponse("طلب غير مصرح به من مصدر خارجي", { status: 403 });
        }
      } catch {
        // invalid referer URL format
      }
    }

    // 2. Authentication: either valid signed token or active session cookie
    let authenticatedUserId: string | null = null;
    let userRole = "STUDENT";

    if (streamToken) {
      const tokenPayload = verifyVideoStreamToken(streamToken);
      if (tokenPayload && tokenPayload.lectureId === lectureId) {
        authenticatedUserId = tokenPayload.userId;
        userRole = tokenPayload.role;
      }
    }

    if (!authenticatedUserId) {
      const user = await getAuthUser();
      if (!user) {
        return new NextResponse("غير مصرح: يرجى تسجيل الدخول لمشاهدة المحاضرة", { status: 401 });
      }
      authenticatedUserId = user.id;
      userRole = user.role;
    }

    // 3. Find Lecture and Chapter Course in Database
    const lecture = await db.lecture.findUnique({
      where: { id: lectureId },
      include: {
        chapter: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lecture) {
      return new NextResponse("المحاضرة غير موجودة", { status: 404 });
    }

    // 4. Verify Student Enrollment (Admins have full access)
    if (userRole === "STUDENT") {
      const enrollment = await db.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: authenticatedUserId,
            courseId: lecture.chapter.courseId,
          },
        },
      });

      if (!enrollment) {
        return new NextResponse("غير مصرح: يجب تفعيل واشتراك الكورس أولاً لمشاهدة الفيديو", {
          status: 403,
        });
      }
    }

    // 5. Locate Local Video File on Disk
    const videoUrl = lecture.videoUrl;
    let fullPath = "";

    if (videoUrl.startsWith("/uploads/")) {
      fullPath = path.join(process.cwd(), "public", videoUrl.replace(/^\//, ""));
    } else if (videoUrl.startsWith("http://") || videoUrl.startsWith("https://")) {
      // Remote video or embed - redirect to the URL
      return NextResponse.redirect(videoUrl);
    } else {
      fullPath = path.join(process.cwd(), "public", "uploads", "videos", videoUrl);
    }

    // Path Traversal Security Check
    const normalized = path.normalize(fullPath);
    if (!normalized.startsWith(process.cwd())) {
      return new NextResponse("طلب غير مصرح به", { status: 403 });
    }

    if (!fs.existsSync(normalized)) {
      return new NextResponse("ملف الفيديو غير موجود على الخادم", { status: 404 });
    }
    fullPath = normalized;

    // 6. Handle HTTP Range Requests (Partial Content 206) for video chunking & streaming
    const stat = await fs.promises.stat(fullPath);
    const fileSize = stat.size;
    const range = request.headers.get("range");

    const commonSecurityHeaders = {
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    };

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        return new NextResponse("Requested range not satisfiable", {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
            ...commonSecurityHeaders,
          },
        });
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(fullPath, { start, end });

      const stream = new ReadableStream({
        start(controller) {
          fileStream.on("data", (chunk) => controller.enqueue(chunk));
          fileStream.on("end", () => controller.close());
          fileStream.on("error", (err) => controller.error(err));
        },
        cancel() {
          fileStream.destroy();
        },
      });

      return new NextResponse(stream as any, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": getMimeType(fullPath),
          ...commonSecurityHeaders,
        },
      });
    } else {
      // Full stream
      const fileStream = fs.createReadStream(fullPath);
      const stream = new ReadableStream({
        start(controller) {
          fileStream.on("data", (chunk) => controller.enqueue(chunk));
          fileStream.on("end", () => controller.close());
          fileStream.on("error", (err) => controller.error(err));
        },
        cancel() {
          fileStream.destroy();
        },
      });

      return new NextResponse(stream as any, {
        status: 200,
        headers: {
          "Content-Length": fileSize.toString(),
          "Content-Type": getMimeType(fullPath),
          "Accept-Ranges": "bytes",
          ...commonSecurityHeaders,
        },
      });
    }
  } catch (error: any) {
    console.error("Video stream error:", error);
    return new NextResponse("حدث خطأ أثناء بث الفيديو", { status: 500 });
  }
}
