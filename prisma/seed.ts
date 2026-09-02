import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seeding...");

  // 1. Create Admin (Mr. Mahmud El-Shahat)
  const adminPhone = "01000000000";
  const existingAdmin = await prisma.user.findUnique({
    where: { phone: adminPhone },
  });

  let adminUser;
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("mahmoud123", 10);
    adminUser = await prisma.user.create({
      data: {
        name: "الأستاذ محمود الشحات",
        phone: adminPhone,
        password: hashedPassword,
        role: "ADMIN",
        isApproved: true,
        isBlocked: false,
        grade: "3",
      },
    });
    console.log("Admin user created: محمود الشحات (01000000000 / mahmoud123)");
  } else {
    adminUser = existingAdmin;
    console.log("Admin user already exists");
  }

  // 2. Create Student (Test Student)
  const studentPhone = "01111111111";
  const existingStudent = await prisma.user.findUnique({
    where: { phone: studentPhone },
  });

  if (!existingStudent) {
    const hashedPassword = await bcrypt.hash("student123", 10);
    await prisma.user.create({
      data: {
        name: "أحمد طالب تجريبي",
        phone: studentPhone,
        password: hashedPassword,
        role: "STUDENT",
        isApproved: true,
        isBlocked: false,
        grade: "3",
      },
    });
    console.log("Student user created: أحمد طالب تجريبي (01111111111 / student123)");
  }

  // 3. Create Courses
  const course1 = await prisma.course.create({
    data: {
      title: "الفيزياء الكهربية والحديثة - الصف الثالث الثانوي",
      description: "شرح كامل ومفصل لمنهج الفيزياء الكهربية وقوانين كيرشوف والفيزياء الحديثة مع حل مئات المسائل.",
      grade: "3",
      image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=600&auto=format&fit=crop",
      isPublished: true,
    },
  });

  const course2 = await prisma.course.create({
    data: {
      title: "الميكانيكا والحرارة - الصف الأول الثانوي",
      description: "أساسيات الفيزياء الكلاسيكية وقوانين نيوتن والحركة الدائرية مع تطبيقات عملية.",
      grade: "1",
      image: "https://images.unsplash.com/photo-1507668077129-56e32842fceb?q=80&w=600&auto=format&fit=crop",
      isPublished: true,
    },
  });

  console.log("Courses created successfully");

  // 4. Chapters & Content for Course 1
  const chapter1 = await prisma.chapter.create({
    data: {
      title: "الفصل الأول: التيار الكهربي وقانون أوم",
      order: 1,
      courseId: course1.id,
    },
  });

  // Lectures
  const lecture1 = await prisma.lecture.create({
    data: {
      title: "المحاضرة الأولى: مقدمة في التيار الكهربي وشدة التيار",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Rickroll dummy video
      duration: "45:00",
      order: 1,
      chapterId: chapter1.id,
    },
  });

  const lecture2 = await prisma.lecture.create({
    data: {
      title: "المحاضرة الثانية: المقاومة الكهربية وقانون أوم",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      duration: "60:00",
      order: 2,
      chapterId: chapter1.id,
    },
  });

  // Homework
  await prisma.homework.create({
    data: {
      title: "واجب المحاضرة الأولى والثانية - المقاومات",
      pdfUrl: "/uploads/homework_1.pdf",
      chapterId: chapter1.id,
    },
  });

  console.log("Chapters, lectures, and homework created");

  // 5. Quiz for Chapter 1
  const quiz = await prisma.quiz.create({
    data: {
      title: "اختبار تجريبي على قانون أوم وتوصيل المقاومات",
      duration: 15,
      passingScore: 50,
      isMandatory: true,
      chapterId: chapter1.id,
    },
  });

  // Questions inside Quiz
  await prisma.question.createMany({
    data: [
      {
        quizId: quiz.id,
        type: "MCQ",
        text: "إذا زاد طول موصل معدني إلى الضعف وقلت مساحة مقطعه إلى النصف، فإن مقاومته الكهربية الكهربائية $R$ تصبح:",
        options: JSON.stringify([
          "تزداد إلى الضعف",
          "تزداد إلى أربعة أمثالها",
          "تقل إلى النصف",
          "تظل ثابتة"
        ]),
        correctOption: 1, // index 1 is "تزداد إلى أربعة أمثالها"
        explanation: "العلاقة هي $R = \\rho_e \\frac{l}{A}$. عند مضاعفة الطول $l \\rightarrow 2l$ وتقليل المساحة $A \\rightarrow A/2$ تصبح المقاومة الجديدة $R' = \\rho_e \\frac{2l}{A/2} = 4 R$."
      },
      {
        quizId: quiz.id,
        type: "MCQ",
        text: "سلكان من نفس المادة طول الأول $l_1 = 5\\text{ m}$ وطول الثاني $l_2 = 10\\text{ m}$، فإذا كانت لهما نفس مساحة المقطع، فإن النسبة بين مقاومتهما $R_1 : R_2$ هي:",
        options: JSON.stringify([
          "$1:2$",
          "$2:1$",
          "$1:4$",
          "$4:1$"
        ]),
        correctOption: 0, // index 0 is "$1:2$"
        explanation: "بما أن السلكين من نفس المادة ولهما نفس مساحة المقطع فإن المقاومة تتناسب طردياً مع الطول: $\\frac{R_1}{R_2} = \\frac{l_1}{l_2} = \\frac{5}{10} = \\frac{1}{2}$."
      },
      {
        quizId: quiz.id,
        type: "WRITTEN",
        text: "اكتب نص قانون أوم للدائرة المغلقة بصيغة رياضية مفسراً دلالة الرموز المستخدمة.",
        explanation: "الصيغة الرياضية لقانون أوم للدائرة المغلقة هي: $I = \\frac{V_{B}}{R + r}$ حيث: $I$ شدة التيار الكلي، $V_B$ القوة الدافعة الكهربية للمصدر، $R$ المقاومة الخارجية الكلية، $r$ المقاومة الداخلية للمصدر."
      }
    ]
  });

  console.log("Quiz and questions created");

  // 6. Activation codes
  await prisma.activationCode.createMany({
    data: [
      {
        code: "PHY-ELEC-333",
        courseId: course1.id,
        isUsed: false,
      },
      {
        code: "PHY-MECH-111",
        courseId: course2.id,
        isUsed: false,
      },
      {
        code: "PHY-LECT-999",
        lectureId: lecture2.id,
        isUsed: false,
      }
    ]
  });

  console.log("Activation codes generated");
  console.log("Seeding complete successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
