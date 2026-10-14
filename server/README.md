# منصة الفيزياء - الأستاذ محمود الشحات (Standalone Backend API)
## Production-Ready Enterprise LMS Backend Architecture

---

## 📌 نظرة عامة على النظام (System Architecture Overview)

تم تصميم وبناء هذا الخادم الخلفي (Backend Server) كخادم مستقل ومنفصل تماماً (Standalone Server) باستخدام **NestJS & TypeScript**، ليكون بمثابة العمود الفقري لمنصة الفيزياء التعليمية الخاصة بالأستاذ محمود الشحات.

تمت ترقية المنظومة بالكامل من نظام Next.js الداخلي (Server Actions / Route Handlers) إلى معمارية كلاسيكية معيارية متعددة الطبقات (Enterprise Layered Architecture) تدعم ملايين الطلبات، وتوفر حماية قصوى لمحتوى الشرح والامتحانات، مع تطبيق صارم لقيد الجهاز الواحد (Device Restriction).

---

## 🏗️ مخطط هيكل المجلدات (Folder Structure Blueprint)

```
server/
├── prisma/
│   └── schema.prisma                 # نموذج قاعدة البيانات (PostgreSQL/MySQL) مع الفهارس والعلاقات
├── src/
│   ├── main.ts                       # نقطة انطلاق الخادم (Helmet, CORS, Validation, Filters)
│   ├── app.module.ts                 # الوحدة الرئيسية لتجميع وحدات النظام
│   ├── config/
│   │   └── configuration.ts          # إدارة متغيرات البيئة بصرامة ونماذج مرنة
│   ├── common/
│   │   ├── constants/                # بادئات مفاتيح Redis، رموز الأخطاء، أوضاع حظر الأجهزة
│   │   ├── enums/                    # تصنيفات الأدوار (ADMIN, TEACHER, STUDENT) وأنواع الأسئلة
│   │   ├── interfaces/               # واجهات البيانات وحمولات JWT وبيانات الأجهزة
│   │   ├── dto/                      # مغلف الاستجابة الموحد (Standardized API Envelope)
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts            # @Roles() لتحديد صلاحيات الوصول
│   │   │   ├── current-user.decorator.ts     # @CurrentUser() لجلب بيانات المستخدم
│   │   │   └── device-fingerprint.decorator.ts # @ExtractDeviceInfo() لاستخراج بصمة الجهاز
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts             # حارس التحقق من صحة وصلاحية رمز JWT
│   │   │   ├── roles.guard.ts                # حارس التحقق من الصلاحيات والتحكم بالأدوار (RBAC)
│   │   │   └── device-restriction.guard.ts   # حارس قيد الجهاز الواحد النشط في Redis
│   │   ├── interceptors/
│   │   │   └── transform.interceptor.ts      # معالج الاستجابات الموحد (Success JSON Envelope)
│   │   ├── filters/
│   │   │   └── all-exceptions.filter.ts      # صائد الأخطاء العام مع رسائل عربية ورموز مخصصة
│   │   └── utils/
│   │       ├── crypto.util.ts                # توليد وتدقيق روابط البث المشفرة HMAC-SHA256
│   │       └── watermark.util.ts             # توليد بيانات العلامة المائية الديناميكية المتحركة
│   └── modules/
│       ├── prisma/                           # وحدة الربط وإدارة جلسات قاعدة البيانات
│       ├── redis/                            # وحدة Redis المخصصة للتحكم في الجلسات والأقفال
│       ├── auth/                             # المصادقة، تسجيل الدخول، تدوير الرموز، حظر الجلسات
│       ├── users/                            # إدارة الطلاب والموافقة وفك الحظر وإعادة تعيين الأجهزة
│       ├── courses/                          # إدارة الكورسات، الفصول، والتفعيل بالأكواد
│       ├── lessons/                          # إدارة المحاضرات وملفات الواجبات
│       ├── video-security/                   # البث المجزأ الآمن (Range Streaming) والروابط الموقعة
│       ├── exams/                            # بنك الأسئلة، الاختبارات، التصحيح التلقائي، والأقفال
│       └── analytics/                        # متابعة تقدم الطلاب وساعات المشاهدة ولوحة المعلم
├── .env.example                              # قالب متغيرات البيئة الإنتاجية
├── package.json                              # تبعيات المشروع وأوامر البناء
├── tsconfig.json                             # ضبط TypeScript الصارم
└── nest-cli.json                             # إعدادات مجمع NestJS
```

---

## 🔒 1. الأمان وقيد الجهاز الواحد (Device Restriction Enforcement)

### آلية العمل عبر Redis:
1. **استخراج بصمة الجهاز (Device Fingerprint):**
   - يتم تجميع بصمة الجهاز عبر مزيج مشفر (SHA-256) من: المعرف الفريد للعميل `x-device-fingerprint`، ترويسة المتصفح `User-Agent`، وعنوان الـ IP.
2. **التحكم في الجلسة النشطة (Active Session):**
   - عند تسجيل الدخول، يتم توليد `sessionId` فريد، وتخزينه في Redis تحت المفتاح:
     `physics_lms:session:active:{userId}`
   - يتم تخزين بيانات: `sessionId`, `deviceFingerprint`, `ipAddress`, `deviceName`, `lastActiveAt`.
3. **سياسة التعامل مع الأجهزة المتعددة (Configurable Policy):**
   - **وضع الاستبدال (`DEVICE_RESTRICTION_MODE="REPLACE"` - الافتراضي):** إذا سجل الطالب الدخول من هاتف جديد، يتم إنهاء جلسته القديمة على الكمبيوتر فوراً، وفي أي طلب لاحق من الكمبيوتر، يرفض `DeviceRestrictionGuard` الطلب برمز `401 / CONCURRENT_DEVICE_DETECTED`.
   - **وضع الحظر (`DEVICE_RESTRICTION_MODE="BLOCK"`):** يرفض الخادم تسجيل دخول الطالب من أي جهاز جديد ويطالبه بالتواصل مع الأستاذ محمود الشحات لإعادة تعيين الجهاز.
4. **تدوير رموز التحديث (Refresh Token Rotation):**
   - كل رمز تحديث يستخدم لمرة واحدة فقط ويتم التحقق من تشفيره داخل Redis. محاولة إعادة استخدام رمز قديم تكشف فوراً محاولات الاختراق وتلغي جميع الجلسات.

---

## 🎬 2. حماية بث الفيديو والعلامة المائية (Video Security & Watermarking)

1. **الروابط الموقعة محددة الصلاحية (Time-Limited Signed URLs):**
   - لا يتم إرسال المسار الحقيقي للفيديو للمتصفح أبداً.
   - يطلب تطبيق العميل رابطاً موقعاً عبر `GET /api/v1/videos/signed-url/:lessonId`.
   - يقوم الخادم بالتحقق من اشتراك الطالب في الكورس، ثم توليد رمز مشفر بتقنية HMAC-SHA256 يربط بين: `userId`, `lessonId`, `expiresAt`, و `clientIp`.
   - الرابط يكون صالحاً لمدة محددة (مثل ساعتين).
2. **البث المجزأ الآمن (HTTP 206 Partial Content):**
   - يستقبل الخادم طلبات أجزاء الفيديو عبر `GET /api/v1/videos/stream/:lessonId?token=...`.
   - يمرر الترويسات الصارمة لمنع التحميل عبر برامج التنزيل التلقائية:
     - `Content-Disposition: inline`
     - `Cache-Control: private, no-cache, no-store, must-revalidate`
     - `X-Content-Type-Options: nosniff`
   - يدعم التنقل والتقديم والترجيع عبر أجزاء البايت `Range: bytes=start-end`.
3. **العلامة المائية الديناميكية (Dynamic Anti-Piracy Watermark):**
   - نقطة النهاية `GET /api/v1/videos/watermark/:lessonId` تولد تراكباً يحتوي على: اسم الطالب، رقم هاتفه، الـ IP، وبذرة عشوائية لتحديد مسار التحرك اللحظي فوق الفيديو، مما يجعل تصوير الشاشة بكاميرا خارجية دليلاً قاطعاً على هوية المسرب.

---

## 📝 3. نظام الامتحانات والتصحيح الآلي (Exams & Automated Grading)

1. **حماية الأسئلة من الفحص (Anti-Inspection):**
   - عند طلب الطالب للاختبار عبر `GET /api/v1/exams/:id`، يقوم الخادم بحذف الإجابة الصحيحة والتفسير العلمي (`correctOption`, `explanation`) تماماً من البيانات لمنع الطلاب من استخراجها عبر DevTools.
2. **التعامل مع الضغط العالي (Peak-Time Concurrency Optimization):**
   - عند تسليم مئات الطلاب للاختبار في نفس الدقيقة:
     - يستخدم الخادم قفل Redis الذري الموزع:
       `physics_lms:lock:exam:submit:{userId}:{quizId}` لمنع التكرار أو تضارب العمليات.
     - يتم تخزين هيكل أسئلة الامتحان مؤقتاً في ذاكرة Redis السريعة لتفادي الضغط على قاعدة البيانات.
3. **التصحيح التلقائي وتغذية النتائج:**
   - يتم احتساب النسبة المئوية فوراً، وتحديد حالة النجاح والرسوب، وتسجيل المحاولة في قاعدة البيانات، ثم إرجاع تقرير تفصيلي مع التفسيرات العلمية الفيزيائية للأسئلة الخاطئة.

---

## 📊 4. التحليلات ولوحة تحكم الطالب والمعلم (Analytics)

- **حفظ تقدم المشاهدة:** `POST /api/v1/analytics/watch-progress` يحفظ الثواني المشاهدة تلقائياً ويحدد اكتمال المحاضرة عند تجاوز 85%.
- **لوحة الطالب:** إحصائيات بنسبة الإنجاز الإجمالية في المنهج، عدد الساعات المشاهدة، ومتوسط درجات الامتحانات.
- **لوحة المعلم:** نظرة شاملة على عدد الطلاب النشطين، والطلاب المعلقين، والامتحانات المنجزة.

---

## 🚀 كيفية تشغيل الخادم (Getting Started)

### 1. تثبيت الحزم:
```bash
cd server
npm install
```

### 2. إعداد قاعدة البيانات وتوليد عميل Prisma:
```bash
npm run prisma:generate
npm run prisma:migrate
```

### 3. تشغيل الخادم في بيئة التطوير:
```bash
npm run start:dev
```

سيعمل الخادم على: `http://localhost:5000/api/v1`
