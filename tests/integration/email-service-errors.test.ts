import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseSmtpError,
  sendPasswordResetEmail,
  verifyEmailConfiguration,
  sendEmail,
  setCustomTransporter,
  clearSentEmails,
  getLastSentEmail,
} from "@/lib/email";
import { POST as forgotPasswordHandler } from "@/app/api/auth/forgot-password/route";
import { GET as adminEmailTestGetHandler, POST as adminEmailTestPostHandler } from "@/app/api/admin/email/test/route";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

vi.mock("next/headers", () => {
  return {
    cookies: () =>
      Promise.resolve({
        set: vi.fn(),
        get: vi.fn(),
        delete: vi.fn(),
      }),
  };
});

describe("Email Service Configuration Errors & Exception Handling", () => {
  const adminEmail = "admin.smtp.test@example.com";
  const studentEmail = "student.smtp.test@example.com";
  let adminUserId: string;
  let studentUserId: string;

  beforeEach(async () => {
    clearSentEmails();
    setCustomTransporter(null);
    vi.restoreAllMocks();

    // Ensure test users exist
    await db.user.deleteMany({
      where: { email: { in: [adminEmail, studentEmail] } },
    });

    const hashedPassword = await hashPassword("ValidPassword123!");
    const adminUser = await db.user.create({
      data: {
        name: "الأدمن التجريبي",
        email: adminEmail,
        phone: "01099998888",
        password: hashedPassword,
        role: "ADMIN",
        isApproved: true,
      },
    });
    adminUserId = adminUser.id;

    const studentUser = await db.user.create({
      data: {
        name: "الطالب التجريبي",
        email: studentEmail,
        phone: "01099997777",
        password: hashedPassword,
        role: "STUDENT",
        isApproved: true,
        grade: "3",
      },
    });
    studentUserId = studentUser.id;
  });

  afterEach(async () => {
    setCustomTransporter(null);
    if (adminUserId || studentUserId) {
      await db.user.deleteMany({
        where: { id: { in: [adminUserId, studentUserId].filter(Boolean) } },
      });
    }
  });

  // ---------------------------------------------------------------------------
  // 1. Error Parsing & Meaningful Error Messages for Administrators
  // ---------------------------------------------------------------------------
  describe("parseSmtpError", () => {
    it("should classify EAUTH authentication failures with actionable guidance", () => {
      const authError = {
        code: "EAUTH",
        message: "Invalid login: 535 5.7.8 Username and Password not accepted",
        command: "AUTH PLAIN",
        response: "535 5.7.8 Authentication credentials invalid",
      };

      const result = parseSmtpError(authError);
      expect(result.code).toBe("EAUTH");
      expect(result.userFriendlyMessage).toContain("SMTP Authentication Failed");
      expect(result.userFriendlyMessage).toContain("SMTP_USER");
      expect(result.userFriendlyMessage).toContain("SMTP_PASS");
      expect(result.technicalDetails).toContain("Code: EAUTH");
      expect(result.technicalDetails).toContain("535 5.7.8");
    });

    it("should classify ECONNREFUSED connection failures with port and host guidance", () => {
      const connError = {
        code: "ECONNREFUSED",
        message: "connect ECONNREFUSED 127.0.0.1:587",
      };

      const result = parseSmtpError(connError);
      expect(result.code).toBe("ECONNREFUSED");
      expect(result.userFriendlyMessage).toContain("SMTP Connection Refused");
      expect(result.userFriendlyMessage).toContain("SMTP_HOST");
      expect(result.userFriendlyMessage).toContain("SMTP_PORT");
    });

    it("should classify ETIMEDOUT connection timeout errors", () => {
      const timeoutError = {
        code: "ETIMEDOUT",
        message: "Connection timeout while connecting to SMTP host",
      };

      const result = parseSmtpError(timeoutError);
      expect(result.code).toBe("ETIMEDOUT");
      expect(result.userFriendlyMessage).toContain("SMTP Connection Timeout");
    });

    it("should classify ENOTFOUND DNS host lookup failures", () => {
      const dnsError = {
        code: "ENOTFOUND",
        message: "getaddrinfo ENOTFOUND smtp.nonexistent-host.domain",
      };

      const result = parseSmtpError(dnsError);
      expect(result.code).toBe("ENOTFOUND");
      expect(result.userFriendlyMessage).toContain("SMTP Host Not Found");
      expect(result.userFriendlyMessage).toContain("DNS");
    });

    it("should classify ESOCKET / TLS certificate handshake failures", () => {
      const tlsError = {
        code: "ESOCKET",
        message: "self signed certificate in certificate chain",
      };

      const result = parseSmtpError(tlsError);
      expect(result.code).toBe("ESOCKET");
      expect(result.userFriendlyMessage).toContain("SMTP TLS/SSL Handshake Error");
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Exception Handling Blocks in SMTP / Nodemailer Service Calls
  // ---------------------------------------------------------------------------
  describe("Nodemailer service calls exception handling & internal logging", () => {
    it("should wrap sendPasswordResetEmail in try-catch and log failure details internally without crashing", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Mock a failing Nodemailer transporter
      const mockFailingTransporter = {
        sendMail: vi.fn().mockRejectedValue({
          code: "EAUTH",
          message: "535 Authentication failed for user",
          command: "AUTH LOGIN",
          response: "535 5.7.8 Credentials rejected",
        }),
        verify: vi.fn(),
      } as any;

      setCustomTransporter(mockFailingTransporter);

      const result = await sendPasswordResetEmail({
        to: studentEmail,
        otp: "123456",
        resetLink: "http://localhost:3000/reset-password?email=" + encodeURIComponent(studentEmail),
        userName: "طالب اختبار",
      });

      // Verify failure result is returned cleanly to caller
      expect(result.success).toBe(false);
      expect(result.error).toContain("SMTP Authentication Failed");
      expect(result.code).toBe("EAUTH");
      expect(result.details).toContain("Credentials rejected");

      // Verify internal failure details were logged
      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedCall = consoleErrorSpy.mock.calls.find((call) =>
        call.some((arg) => typeof arg === "string" && arg.includes("[EmailService] Failed to send password reset email"))
      );
      expect(loggedCall).toBeDefined();

      // Ensure failed email was not saved to sent history
      expect(getLastSentEmail()).toBeUndefined();
    });

    it("should wrap verifyEmailConfiguration in try-catch and log failure details internally", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const mockFailingTransporter = {
        sendMail: vi.fn(),
        verify: vi.fn().mockRejectedValue({
          code: "ECONNREFUSED",
          message: "connect ECONNREFUSED mail.physics-lms.com:587",
        }),
      } as any;

      setCustomTransporter(mockFailingTransporter);

      const result = await verifyEmailConfiguration();

      expect(result.success).toBe(false);
      expect(result.error).toContain("SMTP Connection Refused");
      expect(result.code).toBe("ECONNREFUSED");

      // Verify internal diagnostics logged
      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedCall = consoleErrorSpy.mock.calls.find((call) =>
        call.some((arg) => typeof arg === "string" && arg.includes("[EmailService] SMTP configuration verification failed"))
      );
      expect(loggedCall).toBeDefined();
    });

    it("should wrap sendEmail in try-catch and log failure details internally", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const mockFailingTransporter = {
        sendMail: vi.fn().mockRejectedValue({
          code: "ETIMEDOUT",
          message: "Connection timeout after 10000ms",
        }),
        verify: vi.fn(),
      } as any;

      setCustomTransporter(mockFailingTransporter);

      const result = await sendEmail({
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test</p>",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("SMTP Connection Timeout");
      expect(result.code).toBe("ETIMEDOUT");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Client Error Responses on SMTP Misconfiguration in /api/auth/forgot-password
  // ---------------------------------------------------------------------------
  describe("Forgot Password Route - Error Responses on Email Delivery Failure", () => {
    it("should log failure internally and return HTTP 500 with meaningful error when SMTP fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Mock SMTP failure
      const mockFailingTransporter = {
        sendMail: vi.fn().mockRejectedValue({
          code: "EAUTH",
          message: "535 Authentication failed for user",
          response: "535 5.7.8 Credentials rejected",
        }),
        verify: vi.fn(),
      } as any;

      setCustomTransporter(mockFailingTransporter);

      const req = new NextRequest("http://localhost/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: studentEmail }),
      });

      const res = await forgotPasswordHandler(req);

      // Must return HTTP 500 error instead of false success
      expect(res.status).toBe(500);

      const body = await res.json();
      expect(body.error).toContain("SMTP Authentication Failed");
      expect(body.code).toBe("EAUTH");
      expect(body.details).toBeDefined();

      // Internal logging must have recorded the failure details
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Admin Diagnostic Endpoint: /api/admin/email/test
  // ---------------------------------------------------------------------------
  describe("Admin Email Configuration Test Endpoint (/api/admin/email/test)", () => {
    it("should return HTTP 401 when unauthenticated", async () => {
      // Mock unauthenticated
      vi.spyOn(await import("@/lib/auth"), "getAuthUser").mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/admin/email/test", { method: "GET" });
      const res = await adminEmailTestGetHandler(req);
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.error).toBe("غير مصرح بالوصول");
    });

    it("should return HTTP 401 when user is not an ADMIN", async () => {
      // Mock student role
      vi.spyOn(await import("@/lib/auth"), "getAuthUser").mockResolvedValue({
        id: studentUserId,
        role: "STUDENT",
      } as any);

      const req = new NextRequest("http://localhost/api/admin/email/test", { method: "GET" });
      const res = await adminEmailTestGetHandler(req);
      expect(res.status).toBe(401);
    });

    it("GET: should return HTTP 500 with meaningful diagnostic error when SMTP verification fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.spyOn(await import("@/lib/auth"), "getAuthUser").mockResolvedValue({
        id: adminUserId,
        email: adminEmail,
        name: "الأدمن",
        role: "ADMIN",
      } as any);

      // Transporter rejects verification due to bad credentials
      const mockTransporter = {
        verify: vi.fn().mockRejectedValue({
          code: "EAUTH",
          message: "Invalid login credentials",
          response: "535 Error: authentication failed",
        }),
      } as any;

      setCustomTransporter(mockTransporter);

      const req = new NextRequest("http://localhost/api/admin/email/test", { method: "GET" });
      const res = await adminEmailTestGetHandler(req);

      expect(res.status).toBe(500);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain("SMTP Authentication Failed");
      expect(body.code).toBe("EAUTH");
      expect(body.details).toContain("535 Error: authentication failed");

      // Verify failure logged internally
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("GET: should return HTTP 200 with success message when SMTP verification succeeds", async () => {
      vi.spyOn(await import("@/lib/auth"), "getAuthUser").mockResolvedValue({
        id: adminUserId,
        email: adminEmail,
        name: "الأدمن",
        role: "ADMIN",
      } as any);

      const mockTransporter = {
        verify: vi.fn().mockResolvedValue(true),
      } as any;

      setCustomTransporter(mockTransporter);

      const req = new NextRequest("http://localhost/api/admin/email/test", { method: "GET" });
      const res = await adminEmailTestGetHandler(req);

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toContain("تم التحقق");
    });

    it("POST: should return HTTP 500 with clear error response when sending test email fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.spyOn(await import("@/lib/auth"), "getAuthUser").mockResolvedValue({
        id: adminUserId,
        email: adminEmail,
        name: "الأدمن",
        role: "ADMIN",
      } as any);

      // Transporter fails to send
      const mockTransporter = {
        sendMail: vi.fn().mockRejectedValue({
          code: "ECONNREFUSED",
          message: "connect ECONNREFUSED 127.0.0.1:25",
        }),
      } as any;

      setCustomTransporter(mockTransporter);

      const req = new NextRequest("http://localhost/api/admin/email/test", {
        method: "POST",
        body: JSON.stringify({ testEmail: "test-destination@example.com" }),
      });
      const res = await adminEmailTestPostHandler(req);

      expect(res.status).toBe(500);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain("SMTP Connection Refused");
      expect(body.code).toBe("ECONNREFUSED");
      expect(body.details).toContain("127.0.0.1:25");

      // Verify internal failure logged
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("POST: should return HTTP 200 with confirmation message when sending test email succeeds", async () => {
      vi.spyOn(await import("@/lib/auth"), "getAuthUser").mockResolvedValue({
        id: adminUserId,
        email: adminEmail,
        name: "الأدمن",
        role: "ADMIN",
      } as any);

      const mockTransporter = {
        sendMail: vi.fn().mockResolvedValue({ messageId: "test-msg-12345" }),
      } as any;

      setCustomTransporter(mockTransporter);

      const req = new NextRequest("http://localhost/api/admin/email/test", {
        method: "POST",
        body: JSON.stringify({ testEmail: "test-destination@example.com" }),
      });
      const res = await adminEmailTestPostHandler(req);

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toContain("تم إرسال بريد الاختبار بنجاح إلى test-destination@example.com");
    });
  });
});
