import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signToken, verifyToken, getJwtSecret } from "@/lib/auth";
import { generateVideoStreamToken, verifyVideoStreamToken } from "@/lib/video-security";

describe("JWT Secret Externalization & Dynamic Loading", () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = "initial-test-secret-value-12345";
  });

  afterEach(() => {
    if (originalSecret !== undefined) {
      process.env.JWT_SECRET = originalSecret;
    } else {
      delete process.env.JWT_SECRET;
    }
  });

  it("should read JWT_SECRET dynamically from process.env", () => {
    expect(getJwtSecret()).toBe("initial-test-secret-value-12345");

    process.env.JWT_SECRET = "dynamically-updated-secret-key-67890";
    expect(getJwtSecret()).toBe("dynamically-updated-secret-key-67890");
  });

  it("should sign and verify tokens using dynamic process.env.JWT_SECRET", () => {
    const payload = { userId: "user-1", role: "STUDENT" };
    const token = signToken(payload);

    const verified = verifyToken(token);
    expect(verified).not.toBeNull();
    expect(verified.userId).toBe("user-1");
    expect(verified.role).toBe("STUDENT");
  });

  it("should reject previously signed tokens when process.env.JWT_SECRET changes", () => {
    process.env.JWT_SECRET = "key-version-alpha";
    const token = signToken({ userId: "student-alpha" });

    // Verifies with current secret
    expect(verifyToken(token)).not.toBeNull();

    // Dynamically change the secret
    process.env.JWT_SECRET = "key-version-beta";

    // Old token must fail verification under the new secret
    expect(verifyToken(token)).toBeNull();

    // A token signed with the new secret must verify under the new secret
    const newToken = signToken({ userId: "student-alpha" });
    expect(verifyToken(newToken)).not.toBeNull();
  });

  it("should fail closed and throw error when process.env.JWT_SECRET is missing during signToken", () => {
    delete process.env.JWT_SECRET;

    expect(() => getJwtSecret()).toThrow("JWT_SECRET environment variable is not defined");
    expect(() => signToken({ userId: "student-1" })).toThrow("JWT_SECRET environment variable is not defined");
    expect(verifyToken("any-arbitrary-token")).toBeNull();
  });

  it("should dynamically sign and verify video streaming tokens via process.env.JWT_SECRET", () => {
    process.env.JWT_SECRET = "stream-secret-alpha";
    const streamToken = generateVideoStreamToken("user-1", "lecture-99", "STUDENT", "127.0.0.1");

    const decoded = verifyVideoStreamToken(streamToken);
    expect(decoded).not.toBeNull();
    expect(decoded?.lectureId).toBe("lecture-99");
    expect(decoded?.userId).toBe("user-1");

    // Dynamic rotation of secret
    process.env.JWT_SECRET = "stream-secret-beta";
    expect(verifyVideoStreamToken(streamToken)).toBeNull();
  });
});
