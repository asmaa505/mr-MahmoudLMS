import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import path from "path";
import fs from "fs";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify admin permissions
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "غير مصرح لك برفع الملفات، هذه الميزة متاحة للمسؤولين فقط" },
        { status: 401 }
      );
    }

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || typeof file === "string" || !file.size) {
      return NextResponse.json(
        { error: "لم يتم العثور على ملف صالح للرفع" },
        { status: 400 }
      );
    }

    // 3. Strict extension and MIME whitelist
    const originalName = path.basename(file.name || "file");
    const rawExt = path.extname(originalName).toLowerCase();
    const mimeType = file.type?.toLowerCase() || "";

    const ALLOWED_IMAGES = [".jpg", ".jpeg", ".png", ".webp"];
    const ALLOWED_VIDEOS = [".mp4", ".webm", ".ogg", ".mov", ".mkv"];
    const ALLOWED_DOCS = [".pdf"];

    let category = "";
    if (ALLOWED_IMAGES.includes(rawExt) && (mimeType.startsWith("image/") || !mimeType)) {
      category = "images";
      if (file.size > 15 * 1024 * 1024) {
        return NextResponse.json({ error: "حجم الصورة كبير جداً، الحد الأقصى 15 ميجابايت" }, { status: 400 });
      }
    } else if (ALLOWED_VIDEOS.includes(rawExt) && (mimeType.startsWith("video/") || !mimeType)) {
      category = "videos";
      if (file.size > 500 * 1024 * 1024) {
        return NextResponse.json({ error: "حجم الفيديو كبير جداً، الحد الأقصى 500 ميجابايت" }, { status: 400 });
      }
    } else if (ALLOWED_DOCS.includes(rawExt) && (mimeType === "application/pdf" || !mimeType)) {
      category = "documents";
      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json({ error: "حجم الملف كبير جداً، الحد الأقصى 50 ميجابايت" }, { status: 400 });
      }
    } else {
      return NextResponse.json(
        { error: "نوع الملف غير مدعوم لأسباب أمنية. الملفات المسموحة هي: الصور (JPG/PNG/WEBP)، الفيديوهات (MP4/WEBM/MOV)، وملفات PDF فقط" },
        { status: 400 }
      );
    }

    // 4. Generate a sanitized unique filename to prevent path traversal
    const ext = rawExt;
    const rawBase = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().slice(0, 8);
    const safeFileName = `${timestamp}-${rawBase || "media"}-${randomId}${ext}`;

    // 5. Ensure directory exists in public/uploads/[category]
    const uploadDir = path.join(process.cwd(), "public", "uploads", category);
    await fs.promises.mkdir(uploadDir, { recursive: true });

    // 6. Write file buffer to disk
    const filePath = path.join(uploadDir, safeFileName);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.promises.writeFile(filePath, buffer);

    // 7. Return accessible public URL
    const publicUrl = `/uploads/${category}/${safeFileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: safeFileName,
      originalName: originalName,
      size: file.size,
      category,
    });
  } catch (error: any) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع أثناء رفع الملف إلى الخادم" },
      { status: 500 }
    );
  }
}
