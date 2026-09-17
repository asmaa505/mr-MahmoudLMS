import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { db } from "./db";
import { redirect } from "next/navigation";


const JWT_SECRET = process.env.JWT_SECRET || "mahmoud-el-shahat-physics-lms-super-secret-key-2026";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function getCurrentUser(allowedRole?: "ADMIN" | "STUDENT") {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (token) {
      const decoded = verifyToken(token);
      if (decoded && decoded.userId && decoded.sessionId) {
        const session = await db.session.findUnique({
          where: { token },
          include: {
            user: true,
          },
        });

        if (session && !session.user.isBlocked) {
          return session.user;
        }
      }
    }
  } catch (e) {
    // Session lookup failed
  }

  return null;
}

// Aliasing for compatibility with pre-existing code imports
export const getAuthUser = getCurrentUser;

export async function requireAuth(allowedRole?: "ADMIN" | "STUDENT") {
  const user = await getCurrentUser(allowedRole);

  if (user) {
    if (allowedRole && user.role !== allowedRole) {
      if (user.role === "ADMIN") {
        redirect("/admin");
      } else {
        redirect("/student");
      }
    }
    return user;
  }

  redirect("/login");
}
