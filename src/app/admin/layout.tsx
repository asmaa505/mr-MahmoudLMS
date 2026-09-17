import React from "react";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import AdminSidebarClient from "./AdminSidebarClient";

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

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row text-right">
      {/* Responsive Sidebar (Mobile/Tablet Drawer + Desktop Fixed) */}
      <AdminSidebarClient userName={user.name} logoutAction={logoutAction} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Desktop Header Bar (Hidden on Mobile/Tablet as mobile header is in drawer component) */}
        <header className="hidden lg:flex bg-white border-b border-slate-200 h-16 items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
          <h2 className="font-black text-slate-800 text-sm lg:text-base">منصة الإدارة التعليمية</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
              حساب المعلم
            </span>
            <span className="text-xs lg:text-sm font-bold text-slate-800">{user.name}</span>
          </div>
        </header>

        {/* Workspace body */}
        <main className="flex-1 p-3 sm:p-5 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
