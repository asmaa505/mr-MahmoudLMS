import React from "react";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import CodesClient from "./CodesClient";

export default async function AdminCodesPage() {
  const user = await getAuthUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  // Fetch all courses
  const courses = await db.course.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Fetch all lectures with course & chapter info
  const lectures = await db.lecture.findMany({
    include: {
      chapter: {
        include: {
          course: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch all activation codes
  const codes = await db.activationCode.findMany({
    include: {
      course: true,
      lecture: {
        include: {
          chapter: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Query student user records to map who used what code
  const students = await db.user.findMany({
    where: { role: "STUDENT" },
    select: { id: true, name: true },
  });

  const studentMap = new Map(students.map((s) => [s.id, s.name]));

  // Inject student names directly into the codes objects for easy viewing
  const codesWithStudentNames = codes.map((c) => ({
    ...c,
    studentName: c.usedById ? studentMap.get(c.usedById) || "طالب محذوف" : null,
  }));

  return (
    <div className="max-w-7xl mx-auto">
      <CodesClient
        courses={courses}
        lectures={lectures}
        initialCodes={codesWithStudentNames}
      />
    </div>
  );
}
