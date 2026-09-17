import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Creating/Updating demo accounts...");

  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const studentPasswordHash = await bcrypt.hash("student123", 10);

  // 1. Admin Account (Mr. Mahmoud El-Shahat)
  const adminPhone = "01012345678";
  const admin = await prisma.user.upsert({
    where: { phone: adminPhone },
    update: {
      name: "الأستاذ محمود الشحات",
      password: adminPasswordHash,
      role: "ADMIN",
      isApproved: true,
      isBlocked: false,
      grade: "3",
    },
    create: {
      name: "الأستاذ محمود الشحات",
      phone: adminPhone,
      password: adminPasswordHash,
      role: "ADMIN",
      isApproved: true,
      isBlocked: false,
      grade: "3",
    },
  });
  console.log(`✓ Admin created: ${admin.name} (${admin.phone} / admin123)`);

  // Also support the original 01000000000 admin phone if preferred
  await prisma.user.upsert({
    where: { phone: "01000000000" },
    update: {
      name: "الأستاذ محمود الشحات",
      password: adminPasswordHash,
      role: "ADMIN",
      isApproved: true,
      isBlocked: false,
      grade: "3",
    },
    create: {
      name: "الأستاذ محمود الشحات",
      phone: "01000000000",
      password: adminPasswordHash,
      role: "ADMIN",
      isApproved: true,
      isBlocked: false,
      grade: "3",
    },
  });

  // 2. Student - 3rd Secondary (Grade 3) with active enrollment
  const student3Phone = "01111111111";
  const student3 = await prisma.user.upsert({
    where: { phone: student3Phone },
    update: {
      name: "عمر خالد (طالب 3 ثانوي)",
      password: studentPasswordHash,
      role: "STUDENT",
      isApproved: true,
      isBlocked: false,
      grade: "3",
    },
    create: {
      name: "عمر خالد (طالب 3 ثانوي)",
      phone: student3Phone,
      password: studentPasswordHash,
      role: "STUDENT",
      isApproved: true,
      isBlocked: false,
      grade: "3",
    },
  });
  console.log(`✓ Student 3rd Sec created: ${student3.name} (${student3.phone} / student123)`);

  // 3. Student - 2nd Secondary (Grade 2)
  const student2Phone = "01222222222";
  const student2 = await prisma.user.upsert({
    where: { phone: student2Phone },
    update: {
      name: "سارة محمد (طالبة 2 ثانوي)",
      password: studentPasswordHash,
      role: "STUDENT",
      isApproved: true,
      isBlocked: false,
      grade: "2",
    },
    create: {
      name: "سارة محمد (طالبة 2 ثانوي)",
      phone: student2Phone,
      password: studentPasswordHash,
      role: "STUDENT",
      isApproved: true,
      isBlocked: false,
      grade: "2",
    },
  });
  console.log(`✓ Student 2nd Sec created: ${student2.name} (${student2.phone} / student123)`);

  // 4. Student - 1st Secondary (Grade 1)
  const student1Phone = "01555555555";
  const student1 = await prisma.user.upsert({
    where: { phone: student1Phone },
    update: {
      name: "يوسف علي (طالب 1 ثانوي)",
      password: studentPasswordHash,
      role: "STUDENT",
      isApproved: true,
      isBlocked: false,
      grade: "1",
    },
    create: {
      name: "يوسف علي (طالب 1 ثانوي)",
      phone: student1Phone,
      password: studentPasswordHash,
      role: "STUDENT",
      isApproved: true,
      isBlocked: false,
      grade: "1",
    },
  });
  console.log(`✓ Student 1st Sec created: ${student1.name} (${student1.phone} / student123)`);

  // 5. Student - Pending Approval (To test Admin Approve/Reject functionality)
  const pendingPhone = "01099998877";
  const pendingStudent = await prisma.user.upsert({
    where: { phone: pendingPhone },
    update: {
      name: "زياد حسام (قيد الانتظار)",
      password: studentPasswordHash,
      role: "STUDENT",
      isApproved: false,
      isBlocked: false,
      grade: "3",
    },
    create: {
      name: "زياد حسام (قيد الانتظار)",
      phone: pendingPhone,
      password: studentPasswordHash,
      role: "STUDENT",
      isApproved: false,
      isBlocked: false,
      grade: "3",
    },
  });
  console.log(`✓ Pending Student created: ${pendingStudent.name} (${pendingStudent.phone} / student123)`);

  // 6. Ensure at least one course exists per grade and enroll student3 in a course
  const courses = await prisma.course.findMany();
  let courseGrade3 = courses.find((c) => c.grade === "3");

  if (!courseGrade3) {
    courseGrade3 = await prisma.course.create({
      data: {
        title: "الفيزياء الكهربية والحديثة - الصف الثالث الثانوي",
        description: "شرح شامل للتيار الكهربي وقوانين كيرشوف والفيزياء الحديثة.",
        grade: "3",
        isPublished: true,
        image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=600&auto=format&fit=crop",
      },
    });
  }

  // Ensure course has a chapter and lecture
  let chapter = await prisma.chapter.findFirst({ where: { courseId: courseGrade3.id } });
  if (!chapter) {
    chapter = await prisma.chapter.create({
      data: {
        title: "الفصل الأول: التيار الكهربي وقانون أوم",
        order: 1,
        courseId: courseGrade3.id,
      },
    });
  }

  let lecture = await prisma.lecture.findFirst({ where: { chapterId: chapter.id } });
  if (!lecture) {
    lecture = await prisma.lecture.create({
      data: {
        title: "المحاضرة الأولى: شدة التيار وفرق الجهد",
        duration: "45:00",
        order: 1,
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        chapterId: chapter.id,
      },
    });
  }

  // Automatically enroll Student 3 in this course so dashboard has an enrolled course ready
  await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId: student3.id,
        courseId: courseGrade3.id,
      },
    },
    update: {},
    create: {
      userId: student3.id,
      courseId: courseGrade3.id,
    },
  });

  // 7. Generate 3 Fresh Unused Activation Codes for testing
  const testCodes = ["PHYSICS-2026-CODE1", "PHYSICS-2026-CODE2", "PHYSICS-2026-CODE3"];
  for (const code of testCodes) {
    await prisma.activationCode.upsert({
      where: { code },
      update: { isUsed: false, usedById: null, usedAt: null, courseId: courseGrade3.id },
      create: {
        code,
        courseId: courseGrade3.id,
        isUsed: false,
      },
    });
  }
  console.log(`✓ Activation codes created for course: ${testCodes.join(", ")}`);

  console.log("\nAll demo accounts and data successfully initialized!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
