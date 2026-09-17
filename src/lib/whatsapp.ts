/**
 * WhatsApp Notification Service for Mr. Mahmoud Physics LMS
 */

export interface WhatsAppNotificationPayload {
  phone: string;
  message: string;
  type?: "QUIZ_GRADE" | "NEW_LECTURE" | "NEW_QUIZ" | "ACTIVATION_CODE" | "GENERAL";
}

/**
 * Format Egyptian phone number to standard international format (e.g., 201012345678)
 */
export function formatEgyptianPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "2" + cleaned;
  } else if (!cleaned.startsWith("20") && cleaned.length === 10) {
    cleaned = "20" + cleaned;
  }
  return cleaned;
}

/**
 * Generate direct WhatsApp web click link for instant manual sending
 */
export function getWhatsAppDirectLink(phone: string, message: string): string {
  const formattedPhone = formatEgyptianPhone(phone);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedText}`;
}

/**
 * Dispatch automated WhatsApp Notification
 */
export async function sendWhatsAppNotification(payload: WhatsAppNotificationPayload) {
  const formattedPhone = formatEgyptianPhone(payload.phone);
  const apiUrl = process.env.WHATSAPP_API_URL;
  const token = process.env.WHATSAPP_API_TOKEN;

  console.log(`[WhatsApp Service] Preparing notification [${payload.type || "GENERAL"}] for ${formattedPhone}:`);
  console.log(`[WhatsApp Message]:\n${payload.message}`);

  if (!apiUrl || !token) {
    // If no external API provider is configured, return fallback status with direct link
    return {
      success: true,
      mode: "LOGGED_FALLBACK",
      phone: formattedPhone,
      directLink: getWhatsAppDirectLink(payload.phone, payload.message),
    };
  }

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: formattedPhone,
        body: payload.message,
      }),
    });

    const data = await res.json();
    return {
      success: res.ok,
      data,
      directLink: getWhatsAppDirectLink(payload.phone, payload.message),
    };
  } catch (error: any) {
    console.error("[WhatsApp Service Error]:", error);
    return {
      success: false,
      error: error.message,
      directLink: getWhatsAppDirectLink(payload.phone, payload.message),
    };
  }
}

/**
 * Pre-formatted Templates
 */
export const WhatsAppTemplates = {
  quizGrade: (studentName: string, quizTitle: string, score: number, passingScore: number) => {
    const statusText = score >= passingScore ? "🎉 مبروك! لقد اجتزت الاختبار بنجاح." : "⚠️ لم تجتز درجة النجاح، يمكنك المراجعة وإعادة المحاولة.";
    return `أهلاً بك يا ${studentName} 👋\nتم تصحيح اختبارك في مادة الفيزياء:\n📘 *${quizTitle}*\n📊 الدرجة المحققة: *%${score}*\n🎯 درجة النجاح: %${passingScore}\n${statusText}\n\nنتمنى لك دوام التوفيق والتميز مع مستر محمود الشحات! ⚡`;
  },
  activationCode: (studentName: string, courseTitle: string, code: string) => {
    return `أهلاً بك يا ${studentName} ⚡\nكود تفعيل الخاص بك:\n📚 الكورس: *${courseTitle}*\n🔑 كود التفعيل: *${code}*\n\nادخل على منصة الفيزياء وفعل كودك للبدء في المشاهدة فوراً! 🚀`;
  },
  newLecture: (gradeName: string, lectureTitle: string, courseTitle: string) => {
    return `تنبيه هام لطالب ${gradeName} 📢\nتم رفع محاضرة جديدة الآن على المنصة:\n📘 الكورس: *${courseTitle}*\n🎥 المحاضرة: *${lectureTitle}*\n\nسجل دخولك الآن لمشاهدة الشرح وتطبيق القوانين! ⚡`;
  },
  newQuiz: (quizTitle: string, courseTitle: string, duration: number) => {
    return `تنبيه اختبار جديد 📝\nتم إضافة اختبار جديد لمادة الفيزياء:\n📘 *${courseTitle}*\n📝 الاختبار: *${quizTitle}*\n⏱ مدة الاختبار: ${duration} دقيقة\n\nادخل الاختبار الآن واختبر مستواك! 🔥`;
  },
};
