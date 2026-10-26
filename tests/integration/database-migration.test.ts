import { describe, it, expect, afterAll } from "vitest";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

describe("Database Provider & PostgreSQL Migration Verification", () => {
  const tempPhone = "01088888888";
  let tempUserId: string | null = null;

  afterAll(async () => {
    if (tempUserId) {
      await db.session.deleteMany({ where: { userId: tempUserId } });
      await db.user.deleteMany({ where: { id: tempUserId } });
    }
  });

  it("should successfully connect to PostgreSQL and query existing data without loss", async () => {
    const userCount = await db.user.count();
    const courseCount = await db.course.count();
    const chapterCount = await db.chapter.count();
    const lectureCount = await db.lecture.count();
    const activationCodeCount = await db.activationCode.count();

    expect(userCount).toBeGreaterThanOrEqual(1);
    expect(courseCount).toBeGreaterThanOrEqual(6);
    expect(chapterCount).toBeGreaterThanOrEqual(5);
    expect(lectureCount).toBeGreaterThanOrEqual(8);
    expect(activationCodeCount).toBeGreaterThanOrEqual(1);
  });

  it("should execute PostgreSQL CRUD transactions seamlessly", async () => {
    // Create
    const newUser = await db.user.create({
      data: {
        name: "طالب تجريبي للاختبار",
        phone: tempPhone,
        password: "hashedPassword123",
        role: "STUDENT",
        isApproved: true,
        grade: "2",
      },
    });
    tempUserId = newUser.id;
    expect(newUser.id).toBeDefined();
    expect(newUser.phone).toBe(tempPhone);

    // Read
    const foundUser = await db.user.findUnique({
      where: { phone: tempPhone },
    });
    expect(foundUser?.name).toBe("طالب تجريبي للاختبار");

    // Update
    const updatedUser = await db.user.update({
      where: { id: newUser.id },
      data: { isApproved: false },
    });
    expect(updatedUser.isApproved).toBe(false);

    // Delete
    await db.user.delete({
      where: { id: newUser.id },
    });
    tempUserId = null;

    const postDeleteUser = await db.user.findUnique({
      where: { phone: tempPhone },
    });
    expect(postDeleteUser).toBeNull();
  });

  it("should strictly enforce unique constraints in PostgreSQL (P2002)", async () => {
    const existing = await db.user.findFirst();
    expect(existing).not.toBeNull();

    await expect(
      db.user.create({
        data: {
          name: "مكرر",
          phone: existing!.phone,
          password: "password123",
        },
      })
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
  });

  it("should strictly enforce foreign key relational integrity in PostgreSQL (P2003)", async () => {
    await expect(
      db.chapter.create({
        data: {
          title: "فصل بدون دورة صالحة",
          order: 99,
          courseId: "non-existent-course-uuid-0000-0000",
        },
      })
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
  });
});
