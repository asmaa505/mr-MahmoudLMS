import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (token) {
      // Delete session from DB
      await db.session.deleteMany({
        where: { token },
      });
    }

    // Clear cookie
    cookieStore.delete("auth_token");

    return NextResponse.json({ message: "تم تسجيل الخروج بنجاح" });
  } catch (error: any) {
    console.error("Logout Error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تسجيل الخروج" },
      { status: 500 }
    );
  }
}
