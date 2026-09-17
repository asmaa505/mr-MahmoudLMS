import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { POST as uploadHandler } from "@/app/api/upload/route";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";
import fs from "fs";
import path from "path";
import { vi } from "vitest";

vi.mock("next/headers", () => {
  const cookieStore = {
    set: vi.fn(),
    get: (key: string) => {
      if (key === "auth_token") {
        return { value: (globalThis as any).__mockUploadToken || "" };
      }
      return null;
    },
    delete: vi.fn(),
  };
  return {
    cookies: () => Promise.resolve(cookieStore),
  };
});

describe("File Upload API Integration Tests", () => {
  const testPhoneAdmin = "01111111199";
  const testPhoneStudent = "01111111188";
  let adminToken = "";
  let studentToken = "";
  let adminUserId = "";
  let studentUserId = "";
  const createdFiles: string[] = [];

  beforeAll(async () => {
    // Cleanup old mock data
    await db.user.deleteMany({ where: { phone: { in: [testPhoneAdmin, testPhoneStudent] } } });

    // Create Admin User
    const admin = await db.user.create({
      data: {
        name: "أدمن تجريبي",
        phone: testPhoneAdmin,
        password: "password123",
        role: "ADMIN",
        isApproved: true,
      },
    });
    adminUserId = admin.id;

    // Create Student User
    const student = await db.user.create({
      data: {
        name: "طالب تجريبي",
        phone: testPhoneStudent,
        password: "password123",
        role: "STUDENT",
        isApproved: true,
      },
    });
    studentUserId = student.id;

    // Create Admin Session
    const adminSessionId = crypto.randomUUID();
    adminToken = signToken({
      userId: admin.id,
      role: admin.role,
      name: admin.name,
      phone: admin.phone,
      sessionId: adminSessionId,
    });
    await db.session.create({ data: { token: adminToken, userId: admin.id } });

    // Create Student Session
    const studentSessionId = crypto.randomUUID();
    studentToken = signToken({
      userId: student.id,
      role: student.role,
      name: student.name,
      phone: student.phone,
      sessionId: studentSessionId,
    });
    await db.session.create({ data: { token: studentToken, userId: student.id } });
  });

  afterAll(async () => {
    // Cleanup DB records
    if (adminUserId) {
      await db.session.deleteMany({ where: { userId: adminUserId } });
      await db.user.delete({ where: { id: adminUserId } });
    }
    if (studentUserId) {
      await db.session.deleteMany({ where: { userId: studentUserId } });
      await db.user.delete({ where: { id: studentUserId } });
    }

    // Cleanup files written to public/uploads
    for (const fileRelPath of createdFiles) {
      const fullPath = path.join(process.cwd(), "public", fileRelPath.replace(/^\//, ""));
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch {}
      }
    }
  });

  it("should reject upload if user is not authenticated or is a student (401)", async () => {
    (globalThis as any).__mockUploadToken = studentToken;

    const formData = new FormData();
    const dummyBlob = new Blob(["fake image data"], { type: "image/png" });
    formData.append("file", dummyBlob, "sample.png");

    const req = new NextRequest("http://localhost/api/upload", {
      method: "POST",
      body: formData,
    });

    const res = await uploadHandler(req);
    expect(res.status).toBe(401);
  });

  it("should fail with 400 if no file is provided in FormData", async () => {
    (globalThis as any).__mockUploadToken = adminToken;

    const formData = new FormData();
    const req = new NextRequest("http://localhost/api/upload", {
      method: "POST",
      body: formData,
    });

    const res = await uploadHandler(req);
    expect(res.status).toBe(400);
  });

  it("should successfully upload an image file and save to /uploads/images/", async () => {
    (globalThis as any).__mockUploadToken = adminToken;

    const formData = new FormData();
    const fileContent = "Fake PNG binary data for testing";
    const dummyBlob = new Blob([fileContent], { type: "image/png" });
    formData.append("file", dummyBlob, "test-diagram.png");

    const req = new NextRequest("http://localhost/api/upload", {
      method: "POST",
      body: formData,
    });

    const res = await uploadHandler(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.url).toMatch(/^\/uploads\/images\/.*\.png$/);
    expect(body.category).toBe("images");

    createdFiles.push(body.url);

    // Verify physical file was written on disk
    const diskPath = path.join(process.cwd(), "public", body.url.replace(/^\//, ""));
    expect(fs.existsSync(diskPath)).toBe(true);
  });

  it("should successfully upload a video file and save to /uploads/videos/", async () => {
    (globalThis as any).__mockUploadToken = adminToken;

    const formData = new FormData();
    const videoContent = "Fake MP4 video binary data";
    const dummyBlob = new Blob([videoContent], { type: "video/mp4" });
    formData.append("file", dummyBlob, "physics-lecture-1.mp4");

    const req = new NextRequest("http://localhost/api/upload", {
      method: "POST",
      body: formData,
    });

    const res = await uploadHandler(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.url).toMatch(/^\/uploads\/videos\/.*\.mp4$/);
    expect(body.category).toBe("videos");

    createdFiles.push(body.url);

    // Verify physical file was written on disk
    const diskPath = path.join(process.cwd(), "public", body.url.replace(/^\//, ""));
    expect(fs.existsSync(diskPath)).toBe(true);
  });
});
