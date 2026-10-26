"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  HelpCircle,
  KeyRound,
  LogOut,
  GraduationCap,
  Menu,
  X,
  UserCheck,
  FileText
} from "lucide-react";

interface AdminSidebarClientProps {
  userName: string;
  logoutAction: () => Promise<void>;
}

export default function AdminSidebarClient({ userName, logoutAction }: AdminSidebarClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    { label: "الإحصائيات العامة", href: "/admin", icon: LayoutDashboard },
    { label: "إدارة الحسابات", href: "/admin/students", icon: Users },
    { label: "تقارير المتابعة الأسبوعية", href: "/admin/reports", icon: FileText },
    { label: "إدارة الكورسات والمحاضرات", href: "/admin/courses", icon: BookOpen },
    { label: "بنك الأسئلة والاختبارات", href: "/admin/quizzes", icon: HelpCircle },
    { label: "أكواد التفعيل", href: "/admin/codes", icon: KeyRound },
  ];

  return (
    <>
      {/* Mobile & Tablet Header Bar (Visible on < lg, including iPad & Tablets) */}
      <header className="lg:hidden bg-physicsNavy-900 text-white h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 border-b border-physicsNavy-800 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-xl bg-physicsNavy-800 hover:bg-physicsNavy-700 text-physicsCyan-400 transition"
            aria-label="القائمة"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Link
            href="/admin"
            className="flex items-center gap-2 group transition"
            aria-label="لوحة تحكم المعلم"
          >
            <div className="relative overflow-hidden rounded-lg border border-physicsCyan-500/30 bg-[#0A1128] p-1 shadow-sm group-hover:border-physicsCyan-400/60 transition">
              <Image
                src="/Images/final_logo.jpg"
                alt="شعار المنصة"
                width={70}
                height={39}
                className="h-7 w-auto max-w-[65px] rounded-[6px] object-contain group-hover:scale-105 transition"
              />
            </div>
            <span className="font-bold text-xs sm:text-sm group-hover:text-physicsCyan-300 transition">أ. محمود الشحات</span>
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-[10px] sm:text-xs font-bold px-2.5 py-0.5 bg-physicsNavy-800 text-physicsCyan-300 rounded-md">
            أدمن
          </span>
          <span className="text-xs sm:text-sm font-semibold text-slate-200 max-w-[140px] truncate">{userName}</span>
        </div>
      </header>

      {/* Mobile & Tablet Drawer Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Container (Fixed Desktop + Mobile/Tablet Drawer) */}
      <aside
        className={`fixed lg:static top-0 right-0 z-50 h-full lg:h-auto w-72 lg:w-64 bg-physicsNavy-900 text-white flex flex-col shrink-0 transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Desktop Admin Brand Header */}
        <div className="p-6 border-b border-physicsNavy-800 flex items-center justify-between">
          <Link
            href="/admin"
            className="flex items-center gap-3 group transition"
            aria-label="لوحة تحكم المعلم"
          >
            <div className="relative overflow-hidden rounded-xl border border-physicsCyan-500/30 bg-[#0A1128] p-1 shadow-md shadow-physicsCyan-500/10 group-hover:border-physicsCyan-400/60 transition duration-300">
              <Image
                src="/Images/final_logo.jpg"
                alt="شعار منصة الأستاذ محمود الشحات للفيزياء"
                width={90}
                height={50}
                className="h-10 w-auto max-w-[80px] rounded-[10px] object-contain group-hover:scale-105 transition"
              />
            </div>
            <div>
              <h1 className="font-extrabold text-sm block group-hover:text-physicsCyan-300 transition">أ. محمود الشحات</h1>
              <span className="text-[10px] text-physicsCyan-400 block -mt-0.5">لوحة تحكم المعلم</span>
            </div>
          </Link>
          {/* Close button inside drawer for mobile/tablet */}
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation menu */}
        <nav className="flex-1 p-4 space-y-1.5 text-right overflow-y-auto">
          {menuItems.map((item, idx) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={idx}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-medium transition ${
                  isActive
                    ? "bg-physicsCyan-500/15 text-physicsCyan-300 font-bold border border-physicsCyan-500/30"
                    : "hover:bg-physicsNavy-800 text-physicsNavy-100 hover:text-white"
                }`}
              >
                <item.icon className={`w-5 h-5 shrink-0 ${isActive ? "text-physicsCyan-400" : "text-physicsNavy-300"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer / Logout */}
        <div className="p-4 border-t border-physicsNavy-800">
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-200 hover:text-white text-xs sm:text-sm font-medium transition"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <span>تسجيل الخروج</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
