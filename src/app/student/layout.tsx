import React from "react";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LogOut, BookOpen, GraduationCap, Award, User } from "lucide-react";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

async function logoutAction() {
  "use server";
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (token) {
    await db.session.deleteMany({ where: { token } });
  }
  cookieStore.delete("auth_token");
  redirect("/login");
}

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth("STUDENT");

  const getGradeName = (g: string) => {
    if (g === "1") return "الصف الأول الثانوي";
    if (g === "2") return "الصف الثاني الثانوي";
    return "الصف الثالث الثانوي";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-physicsNavy-900 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 md:h-20 items-center">
            {/* Logo */}
            <Link
              href="/student"
              className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-physicsCyan-400 rounded-xl transition-all duration-300 py-1"
              aria-label="لوحة التحكم - منصة الفيزياء"
            >
              <div className="relative overflow-hidden rounded-xl border border-physicsCyan-500/30 bg-[#0A1128] p-1 shadow-md group-hover:border-physicsCyan-400/60 group-hover:shadow-[0_0_20px_-2px_rgba(6,182,212,0.3)] transition-all duration-300">
                <Image
                  src="/Images/final_logo.jpg"
                  alt="شعار منصة الأستاذ محمود الشحات للفيزياء"
                  width={150}
                  height={84}
                  className="h-10 md:h-12 w-auto max-w-[120px] md:max-w-[150px] rounded-lg object-contain group-hover:scale-105 group-hover:opacity-95 transition-all duration-300"
                />
              </div>
              <div className="flex flex-col text-right">
                <span className="font-bold text-sm md:text-base block text-white group-hover:text-physicsCyan-300 transition-colors">محمود الشحات</span>
                <span className="text-[10px] md:text-xs text-physicsCyan-400 block -mt-0.5 group-hover:text-physicsCyan-200 transition-colors">منصة الفيزياء</span>
              </div>
            </Link>

            {/* Student Info & Nav links */}
            <div className="flex items-center gap-6">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-sm font-semibold text-white flex items-center gap-1.5 justify-end">
                  <User className="w-4 h-4 text-physicsCyan-400" />
                  {user.name}
                </span>
                <span className="text-xs text-physicsNavy-300 flex items-center gap-1 justify-end">
                  <GraduationCap className="w-3.5 h-3.5 text-physicsCyan-400" />
                  {getGradeName(user.grade)}
                </span>
              </div>

              <div className="h-8 w-px bg-physicsNavy-700 hidden md:block" />

              <Link
                href="/student"
                className="text-sm font-medium hover:text-physicsCyan-400 transition"
              >
                لوحة التحكم
              </Link>

              {/* Logout Button via Server Action */}
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 text-xs hover:bg-red-500 hover:text-white transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">خروج</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* User Info Bar for Mobile */}
      <div className="bg-physicsNavy-800 text-white py-2.5 px-4 block md:hidden border-t border-physicsNavy-700/50 shadow-inner">
        <div className="flex justify-between items-center text-xs">
          <span className="font-medium">الطالب: {user.name}</span>
          <span className="text-physicsCyan-300">{getGradeName(user.grade)}</span>
        </div>
      </div>

      {/* Main Page Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Student Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 text-center text-xs">
        <p>© {new Date().getFullYear()} منصة الفيزياء للأستاذ محمود الشحات. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
}
