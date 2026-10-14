# دليل حماية تسجيل الشاشة واللقطات على الهواتف والأجهزة الذكية
## منصة الأستاذ محمود الشحات (Mr. Mahmoud LMS)

يوضح هذا الدليل كيفية تطبيق حماية العتاد (Hardware-Level Protection) لمنع تصوير الشاشة وتسجيل الفيديو بشكل كامل على أنظمة أندرويد و iOS و PWA.

---

### 1. نظام أندرويد (Android - WebView / Capacitor / PWA)
- **الآلية التقنية**: تفعيل خاصية `FLAG_SECURE` على نافذة التطبيق (`Window`).
- **الملف المرفق**: [MainActivity.kt](file:///d:/Desktop/MR-Mahmoud/mobile-security/android/MainActivity.kt)
- **النتيجة**:
  - تصوير الشاشة (Power + Volume Down): يُظهر النظام رسالة *"لا يمكن التقاط لقطة شاشة بسبب سياسة الأمان"*.
  - برامج التسجيل (OBS, AZ Recorder, مسجل الشاشة المدمج في سامسونج وشاومي): تُسجل شاشة سوداء تماماً مع كتم الصوت.
  - قائمة التطبيقات المفتوحة (Recent Apps / Multitasking): تظهر شاشة بيضاء أو سوداء فارغة للحفاظ على خصوصية المحاضرة.

```kotlin
// تفعيل الحماية في onCreate
window.setFlags(
    WindowManager.LayoutParams.FLAG_SECURE,
    WindowManager.LayoutParams.FLAG_SECURE
)
```

---

### 2. نظام آبل (iOS - Safari & Native Wrapper)
- **الآلية التقنية**:
  1. **على متصفح Safari**: تشغيل الفيديو عبر تقنية **Apple FairPlay Streaming DRM**، والتي تقوم افتراضياً بحجب الشاشة وتحويلها للون الأسود عند تشغيل مسجل الشاشة المدمج في نظام iOS.
  2. **على تطبيق الهاتف (Swift / WKWebView)**: استخدام تقنية حاوية الـ `isSecureTextEntry` الخاصة بـ `UITextField`. محرك الرسم في نظام آبل (CoreAnimation) يعتبر هذا العنصر محمياً مثل حقول كلمات المرور، ويقوم تلقائياً بتعتيم أو تسويد الشاشة في أي تسجيل شاشة أو لقطة شاشة.
- **الملف المرفق**: [SecureVideoView.swift](file:///d:/Desktop/MR-Mahmoud/mobile-security/ios/SecureVideoView.swift)

---

### 3. متصفحات الويب المكتبية (Chrome, Edge, Firefox, Safari)
- **الآلية المطبقة في مشغل الفيديو**:
  1. **درع النشاط الفوري (Active Defense Shield)**:
     - إيقاف الفيديو وتغطية الشاشة بستار أسود عازل فور مغادرة التبويب أو تصغير المتصفح (`visibilitychange` & `blur`).
     - مصراع الحجب الفوري (Instant Blackout Shutter) عند الضغط على أزرار التصوير (`PrintScreen`, `Win+Shift+S`, `Cmd+Shift+4`).
     - فخ اكتشاف أدوات المطورين (DevTools) ومحاولات استخراج الروابط أو التفتيش.
     - منع القائمة المنسدلة (Right-Click) وتحديد النصوص وسحب الوسائط.
  2. **حماية التنزيل المباشر (Anti-Download)**:
     - روابط مشفرة ومؤقتة بصلاحية 15 دقيقة مع توقيع رقمي `HMAC`.
     - منع التضمين الخارجي (Anti-Hotlinking) ورؤوس أمان صارمة تمنع برامج التحميل التلقائي مثل IDM.
  3. **العلامة المائية غير المشتتة (Non-Distracting Forensic Watermark)**:
     - علامة رقمية هادئة بنسبة شفافية منخفضة وانسياب بطيء كل 40 ثانية (تحتوي اسم الطالب ورقم هاتفه وعنوان IP)، تتيح للطالب التركيز دون تشويش بصري، وتضمن تعقب أي تسريب للمحتوى بدقة 100%.
  4. **خيارات البث المتقدم (Enterprise DRM)**:
     - المشغل جاهز للتوصيل بخدمات **VdoCipher** أو **Bunny.net DRM** عند الرغبة في التعتيم الكامل للعتاد أمام برامج مثل OBS على سطح المكتب.
