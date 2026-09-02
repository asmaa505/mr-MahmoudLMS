import React from "react";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
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
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-physicsCyan-500/10 border border-physicsCyan-500/20 text-physicsCyan-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm block">محمود الشحات</span>
                <span className="text-[10px] text-physicsCyan-400 block -mt-0.5">منصة الفيزياء</span>
              </div>
            </div>

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
