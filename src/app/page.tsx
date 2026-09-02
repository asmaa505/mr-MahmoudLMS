"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BookOpen, ShieldCheck, GraduationCap, Trophy, HelpCircle, Layers, Sparkles, ChevronLeft } from "lucide-react";
import LandingClientHelpers from "@/components/LandingClientHelpers";
import FadeIn from "@/components/FadeIn";

export default function LandingPage() {
  const [hoveredLinkText, setHoveredLinkText] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-slate-900 text-white selection:bg-physicsCyan-500 selection:text-slate-900 relative overflow-x-hidden">
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />

      {/* Header / Navbar */}
      <header className="relative z-50 border-b border-slate-800 bg-slate-950/40 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-physicsCyan-500/10 border border-physicsCyan-500/20 text-physicsCyan-400">
              <Layers className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-wide block">محمود الشحات</span>
              <span className="text-xs text-physicsCyan-400 block -mt-1">أستاذ الفيزياء</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium hover:text-physicsCyan-400 transition"
            >
              تسجيل الدخول
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-physicsCyan-500 hover:bg-physicsCyan-400 text-slate-950 font-bold rounded-xl transition text-sm flex items-center gap-1 shadow-lg shadow-physicsCyan-500/20"
            >
              <span>سجل الآن</span>
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="hero" className="w-full snap-start scroll-mt-16 relative z-10">
        <div className="max-w-7xl mx-auto pt-20 pb-24 px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 text-right">
              <FadeIn className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-physicsCyan-500/10 border border-physicsCyan-500/30 text-physicsCyan-400 text-xs font-semibold">
                  <Sparkles className="w-4 h-4" />
                  <span>انطلاقة جديدة نحو التفوق في الفيزياء</span>
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight">
                  افهم الفيزياء مع الأستاذ{" "}
                  <span className="block mt-4 text-transparent bg-clip-text bg-gradient-to-r from-physicsCyan-400 to-physicsCyan-300">
                    محمود الشحات
                  </span>
                </h1>
                <p className="text-slate-300 text-lg leading-relaxed max-w-2xl">
                  منصة تعليمية متطورة مصممة خصيصًا لمساعدتك على إتقان مادة الفيزياء للمرحلة الثانوية. نقدم شرحاً مبسطاً بالرسومات التوضيحية والمعادلات الرياضية، واختبارات دورية ذكية لضمان أعلى درجات الفهم والتفوق.
                </p>

                <div className="flex flex-wrap gap-4 pt-4 justify-start">
                  <Link
                    href="/register"
                    className="px-8 py-3.5 bg-gradient-to-r from-physicsCyan-600 to-physicsCyan-500 hover:from-physicsCyan-500 hover:to-physicsCyan-400 text-white font-bold rounded-xl shadow-xl shadow-physicsCyan-500/10 transition flex items-center gap-2"
                  >
                    <span>ابدأ رحلتك التعليمية</span>
                    <ChevronLeft className="w-5 h-5" />
                  </Link>
                  <Link
                    href="/login"
                    className="px-8 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition"
                  >
                    عرض لوحة التحكم
                  </Link>
                </div>
              </FadeIn>
            </div>

            <div className="lg:col-span-5 relative flex justify-center w-full max-w-md group">
              <FadeIn delay={0.2} className="w-full relative flex justify-center">
                {/* Scientific Graphic Glow */}
                <div className="w-72 h-72 sm:w-80 sm:h-80 lg:w-96 lg:h-96 rounded-full bg-gradient-to-tr from-physicsCyan-500 to-indigo-600 opacity-20 blur-3xl absolute -z-10" />
                <div className="absolute inset-0 bg-gradient-to-tr from-physicsCyan-500/20 to-indigo-500/20 rounded-3xl blur-xl group-hover:opacity-60 transition duration-700 pointer-events-none" />
                
                <div className="relative w-full border border-physicsCyan-500/20 bg-slate-950/40 p-4 rounded-3xl shadow-2xl hover:shadow-physicsCyan-500/10 transition-all duration-500 transform group-hover:-translate-y-1.5 backdrop-blur-sm">
                  
                  {/* Physics Floating Formulas */}
                  <div className="absolute -top-4 -right-4 z-20 px-3.5 py-1.5 bg-physicsCyan-500 text-slate-950 rounded-xl shadow-lg shadow-physicsCyan-500/25 font-bold font-mono text-xs select-none">
                    ΔV = I · R
                  </div>
                  <div className="absolute -bottom-4 -left-4 z-20 px-3.5 py-1.5 bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/25 font-bold font-mono text-xs select-none">
                    E = h · ν
                  </div>

                  {/* The Hero Image */}
                  <div className="relative h-[420px] rounded-2xl overflow-hidden border border-physicsCyan-500/10 bg-slate-900 mb-4 z-10">
                    <img
                      src="/img.jpg" 
                      alt="الأستاذ محمود الشحات"
                      className="w-full h-full object-cover object-[center_top] filter brightness-95 group-hover:scale-[1.02] transition duration-700"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none z-20" />
                  </div>

                  {/* Overlapping Stats widgets */}
                  <div className="grid grid-cols-2 gap-4 relative z-10">
                    <div className="p-4 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-physicsCyan-500/10 flex items-center justify-between text-right shadow-lg shadow-black/25">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">إجمالي الدروس</span>
                        <span className="font-extrabold text-sm md:text-base text-physicsCyan-400 mt-0.5 block">+120 محاضرة</span>
                      </div>
                      <BookOpen className="w-5 h-5 text-physicsCyan-400 shrink-0" />
                    </div>
                    <div className="p-4 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-physicsCyan-500/10 flex items-center justify-between text-right shadow-lg shadow-black/25">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">نسبة التفوق</span>
                        <span className="font-extrabold text-sm md:text-base text-indigo-400 mt-0.5 block">99.2%</span>
                      </div>
                      <Trophy className="w-5 h-5 text-indigo-400 shrink-0" />
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="w-full snap-start scroll-mt-16 bg-slate-950/60 py-20 border-t border-slate-800 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12 relative z-10">
          <FadeIn className="space-y-4">
            <h2 className="text-3xl font-extrabold sm:text-4xl">لماذا تختار منصة الأستاذ محمود الشحات؟</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              تجربة تعليمية فريدة تدمج بين التكنولوجيا الحديثة وتبسيط الفيزياء لضمان تفوقك.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "تجربة مشاهدة سلسة وبدون تشتيت",
                desc: "شاهد دروسك بأعلى جودة وبدون أي انقطاع أو تشتيت، في بيئة تعليمية مستقرة تضمن لك تركيزاً كاملاً أثناء الفهم والاستذكار.",
                icon: ShieldCheck,
                badge: "جودة HD",
                chip1: "مشاهدة مستقرة",
                chip2: "بيئة خالية من التشتيت",
              },
              {
                title: "اختبارات دورية ذكية",
                desc: "اختبر فهمك أولاً بأول بأسئلة تغطي كافة أفكار الامتحانات، مع تصحيح فوري وتفسير علمي يوضح لك سبب كل إجابة.",
                icon: HelpCircle,
                badge: "تقييم ذكي",
                chip1: "تصحيح تلقائي",
                chip2: "تفسير الإجابات",
              },
              {
                title: "متابعة فورية ومستمرة",
                desc: "تابع تطور مستواك خطوة بخطوة من خلال تقارير دقيقة لنتائج درجاتك وحضورك، لتحدد نقاط قوتك وتتغلب على نقاط ضعفك بثقة.",
                icon: GraduationCap,
                badge: "متابعة مستمرة",
                chip1: "تقارير أداء",
                chip2: "إشعار ولي الأمر",
              },
            ].map((feat, idx) => {
              const IconComp = feat.icon;
              return (
                <FadeIn key={idx} delay={idx * 0.2}>
                  <div className="p-8 bg-slate-950/40 border border-slate-800/80 rounded-3xl text-right relative overflow-hidden flex flex-col justify-between group hover:border-physicsCyan-500/50 hover:bg-slate-950/60 hover:shadow-2xl hover:shadow-physicsCyan-950/10 transition-all duration-300 transform hover:-translate-y-1 h-full">
                    {/* Glowing background bubble */}
                    <div className="absolute -top-12 -left-12 w-24 h-24 bg-physicsCyan-500/10 rounded-full blur-xl group-hover:bg-physicsCyan-500/20 transition-all duration-300" />
                    
                    <div className="space-y-5">
                      {/* Top row with Icon and Badge */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-physicsCyan-400 px-2.5 py-0.5 rounded-md bg-physicsCyan-500/10 border border-physicsCyan-500/20">
                          {feat.badge}
                        </span>
                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-physicsCyan-400 group-hover:border-physicsCyan-500/30 group-hover:text-white transition-colors">
                          <IconComp className="w-6 h-6" />
                        </div>
                      </div>
                      
                      {/* Feature Title */}
                      <h3 className="text-xl font-bold text-white group-hover:text-physicsCyan-300 transition-colors">
                        {feat.title}
                      </h3>
                      
                      {/* Feature Description */}
                      <p className="text-slate-400 text-sm leading-relaxed">
                        {feat.desc}
                      </p>
                    </div>

                    {/* Small Chips List at Bottom */}
                    <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-slate-800/40">
                      <span className="px-2.5 py-1 text-[10px] font-semibold bg-slate-900 border border-slate-800 text-slate-400 rounded-full group-hover:border-physicsCyan-500/20 group-hover:text-slate-200 transition-all">
                        {feat.chip1}
                      </span>
                      <span className="px-2.5 py-1 text-[10px] font-semibold bg-slate-900 border border-slate-800 text-slate-400 rounded-full group-hover:border-physicsCyan-500/20 group-hover:text-slate-200 transition-all">
                        {feat.chip2}
                      </span>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* Grade Tiers */}
      <section id="courses" className="w-full snap-start scroll-mt-16 relative z-10">
        <div className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
          <FadeIn className="space-y-4">
            <h2 className="text-3xl font-extrabold sm:text-4xl">منهج الفيزياء لجميع المراحل</h2>
            {/* <p className="text-slate-400 max-w-2xl mx-auto">
              محتوى تعليمي متكامل ومصنف ومحدث باستمرار طبقاً للنظام الجديد للثانوية العامة.
            </p> */}
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "الصف الأول الثانوي", icon: Layers, chip1: "ميكانيكا وحركة", chip2: "ملخصات PDF" },
              { title: "الصف الثاني الثانوي", icon: Sparkles, chip1: "ضوء وحرارة", chip2: "اختبارات دورية" },
              { title: "الصف الثالث الثانوي", icon: Trophy, chip1: "كهربية وحديثة", chip2: "مراجعات شاملة" }
            ].map((grade, idx) => {
              const IconComp = grade.icon;
              return (
                <FadeIn key={idx} delay={idx * 0.2}>
                  <div className="p-6 bg-slate-950/40 border border-slate-800/80 rounded-3xl text-right relative overflow-hidden flex flex-col justify-between group hover:border-physicsCyan-500/50 hover:bg-slate-950/60 hover:shadow-2xl hover:shadow-physicsCyan-950/10 transition-all duration-300 transform hover:-translate-y-1">
                    {/* Glowing background bubble */}
                    <div className="absolute -top-12 -left-12 w-24 h-24 bg-physicsCyan-500/10 rounded-full blur-xl group-hover:bg-physicsCyan-500/20 transition-all duration-300" />
                    
                    <div>
                      {/* Top row with Icon and Badge */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold text-physicsCyan-400 px-2 py-0.5 rounded-md bg-physicsCyan-500/10 border border-physicsCyan-500/20">
                          منهج الفيزياء
                        </span>
                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-physicsCyan-400 group-hover:border-physicsCyan-500/30 group-hover:text-white transition-colors">
                          <IconComp className="w-5 h-5" />
                        </div>
                      </div>
                      
                      {/* Grade Title */}
                      <h3 className="text-xl font-bold text-white mb-3 group-hover:text-physicsCyan-300 transition-colors">
                        {grade.title}
                      </h3>
                      
                      {/* Small Chips List */}
                      <div className="flex flex-wrap gap-2 mb-6">
                        <span className="px-2.5 py-1 text-[10px] font-semibold bg-slate-900 border border-slate-800 text-slate-300 rounded-full">
                          {grade.chip1}
                        </span>
                        <span className="px-2.5 py-1 text-[10px] font-semibold bg-slate-900 border border-slate-800 text-slate-300 rounded-full">
                          {grade.chip2}
                        </span>
                      </div>
                    </div>
                    
                    {/* Bottom Action Buttons */}
                    <div className="space-y-2 mt-auto">
                      <Link
                        href="/register"
                        onMouseEnter={() => setHoveredLinkText(`تسجيل في ${grade.title}`)}
                        onMouseLeave={() => setHoveredLinkText(null)}
                        className="inline-flex w-full justify-center items-center py-3 bg-slate-800 hover:bg-physicsCyan-600 hover:text-slate-950 rounded-xl transition-all duration-200 text-sm font-semibold gap-1 group/btn shadow-lg"
                      >
                        <span>سجل الآن وانضم للمرحلة</span>
                        <ChevronLeft className="w-4 h-4 transform group-hover/btn:-translate-x-0.5 transition-transform" />
                      </Link>

                      <Link
                        href={`/curriculum/${idx + 1}`}
                        onMouseEnter={() => setHoveredLinkText(`معاينة دروس ${grade.title}`)}
                        onMouseLeave={() => setHoveredLinkText(null)}
                        className="inline-flex w-full justify-center items-center py-2.5 border border-slate-800 hover:border-physicsCyan-500/30 bg-slate-900/40 text-slate-400 hover:text-physicsCyan-400 rounded-xl transition-all duration-200 text-xs font-semibold gap-1 group/preview"
                      >
                        <span>معاينة المنهج والدروس المتاحة</span>
                        <BookOpen className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>


        </div>
      </section>

      {/* Footer */}
      <footer className="w-full snap-start scroll-mt-16 border-t border-slate-800 bg-slate-950/80 backdrop-blur-md py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-right pb-8 border-b border-slate-800/60">
            {/* Column 1: Brand Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white tracking-wide">منصة الأستاذ محمود الشحات</h3>
              {/* <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                نصنع التفوق في الفيزياء بأساليب شرح حديثة واختبارات تفاعلية ذكية للوصول إلى الدرجة النهائية في الثانوية العامة.
              </p> */}
            </div>

            {/* Column 2: Quick Links */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-physicsCyan-400 uppercase tracking-wider">روابط سريعة</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link 
                    href="/login" 
                    // title="صفحة تسجيل دخول الطلاب" 
                    onMouseEnter={() => setHoveredLinkText("بوابة تسجيل دخول الطلاب")}
                    onMouseLeave={() => setHoveredLinkText(null)}
                    className="text-slate-400 hover:text-white transition-colors duration-200"
                  >
                    دخول الطلاب
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/register" 
                    // title="صفحة إنشاء حساب طالب جديد" 
                    onMouseEnter={() => setHoveredLinkText("إنشاء حساب طالب جديد")}
                    onMouseLeave={() => setHoveredLinkText(null)}
                    className="text-slate-400 hover:text-white transition-colors duration-200"
                  >
                    إنشاء حساب جديد
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Social Channels */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-physicsCyan-400 uppercase tracking-wider">قنوات التواصل</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a
                    href="https://t.me/+DGiM6FSy7ANmNDA0"
                    target="_blank"
                    rel="noopener noreferrer"
                    // title="قناة التليجرام الرسمية للمنصة"
                    onMouseEnter={() => setHoveredLinkText("قناة التليجرام الرسمية")}
                    onMouseLeave={() => setHoveredLinkText(null)}
                    className="text-slate-400 hover:text-physicsCyan-400 transition-colors duration-200 flex items-center justify-start gap-2 group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-physicsCyan-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                    <span>قناة التليجرام</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://youtube.com/@mahmoudahmed3445?si=-2u-JKDLt8IdELCL"
                    target="_blank"
                    rel="noopener noreferrer"
                    // title="قناة اليوتيوب الرسمية للأستاذ محمود الشحات"
                    onMouseEnter={() => setHoveredLinkText("قناة اليوتيوب التعليمية")}
                    onMouseLeave={() => setHoveredLinkText(null)}
                    className="text-slate-400 hover:text-red-500 transition-colors duration-200 flex items-center justify-start gap-2 group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                    <span>قناة اليوتيوب</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.facebook.com/profile.php?id=100080308252825"
                    target="_blank"
                    rel="noopener noreferrer"
                    // title="صفحة الفيسبوك الرسمية للأستاذ محمود الشحات"
                    onMouseEnter={() => setHoveredLinkText("صفحة الفيسبوك الرسمية")}
                    onMouseLeave={() => setHoveredLinkText(null)}
                    className="text-slate-400 hover:text-blue-500 transition-colors duration-200 flex items-center justify-start gap-2 group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                    <span>صفحة الفيسبوك</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4 text-center sm:text-right">
            <p>© {new Date().getFullYear()} جميع الحقوق محفوظة لمنصة الأستاذ محمود الشحات.</p>
            <a 
              href="https://www.linkedin.com/in/asmaa-maryah%F0%9F%8D%83-86028a2b3/?lipi=urn%3Ali%3Apage%3Ad_flagship3_feed%3BkaemjYbiRMasvIt9rdgimA%3D%3D"
              target="_blank"
              rel="noopener noreferrer"
              // title="زيارة الملف الشخصي للمهندسة أسماء مارية على LinkedIn"
              onMouseEnter={() => setHoveredLinkText("Hiiii, Je suis asmaa you can call me memo❤️, this is my LinkedIn, nice to meet you")}
              onMouseLeave={() => setHoveredLinkText(null)}
              className="text-slate-500 hover:text-physicsCyan-400 hover:brightness-125 transition-all duration-300 font-medium text-xs tracking-wide"
            >
              Made by Eng. Asmaa Maryah
            </a>
          </div>
        </div>
      </footer>

      <LandingClientHelpers hoveredLinkText={hoveredLinkText} />
    </div>
  );
}
