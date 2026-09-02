import React from "react";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  HelpCircle,
  KeyRound,
  LogOut,
  Layers,
  GraduationCap
} from "lucide-react";
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

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth("ADMIN");

  const menuItems = [
    { label: "الإحصائيات العامة", href: "/admin", icon: LayoutDashboard },
    { label: "إدارة الطلاب", href: "/admin/students", icon: Users },
    { label: "إدارة الكورسات والمحاضرات", href: "/admin/courses", icon: BookOpen },
    { label: "بنك الأسئلة والاختبارات", href: "/admin/quizzes", icon: HelpCircle },
    { label: "أكواد التفعيل", href: "/admin/codes", icon: KeyRound },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Sidebar - Collapses on mobile */}
      <aside className="w-full md:w-64 bg-physicsNavy-900 text-white flex flex-col shrink-0">
        {/* Admin Brand */}
        <div className="p-6 border-b border-physicsNavy-800 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-physicsCyan-500/10 border border-physicsCyan-500/20 text-physicsCyan-400">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm block">أ. محمود الشحات</h1>
            <span className="text-[10px] text-physicsCyan-400 block -mt-0.5">لوحة تحكم المعلم</span>
          </div>
        </div>

        {/* Navigation menu */}
        <nav className="flex-1 p-4 space-y-2 text-right">
          {menuItems.map((item, idx) => (
            <Link
              key={idx}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-physicsNavy-800 text-sm font-medium text-physicsNavy-100 transition hover:text-white"
            >
              <item.icon className="w-5 h-5 text-physicsCyan-400 shrink-0" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Sidebar Footer / Logout */}
        <div className="p-4 border-t border-physicsNavy-800">
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-200 hover:text-white text-sm font-medium transition"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <span>تسجيل الخروج</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main content viewport */}
      <div className="flex-1 flex flex-col overflow-x-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm">
          <h2 className="font-black text-slate-800 text-base md:text-lg">منصة الإدارة التعليمية</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
              حساب المعلم
            </span>
            <span className="text-sm font-bold text-slate-800">{user.name}</span>
          </div>
        </header>

        {/* Workspace body */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
