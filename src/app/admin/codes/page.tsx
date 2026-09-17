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

  // Fetch all activation codes with assignedTo & course/lecture details
  const codes = await db.activationCode.findMany({
    include: {
      course: true,
      assignedTo: {
        select: { id: true, name: true, phone: true },
      },
      lecture: {
        include: {
          chapter: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Query student user records with phone to map users and for WhatsApp target selection
  const students = await db.user.findMany({
    where: { role: "STUDENT" },
    select: { id: true, name: true, phone: true },
    orderBy: { name: "asc" },
  });

  const studentMap = new Map(students.map((s) => [s.id, s]));

  // Inject student names & phones directly into the codes objects for easy viewing
  const codesWithStudentDetails = codes.map((c) => {
    const usedStudent = c.usedById ? studentMap.get(c.usedById) : null;
    const assignedStudent = c.assignedTo || (c.assignedToId ? studentMap.get(c.assignedToId) : null);

    return {
      ...c,
      studentName: usedStudent ? usedStudent.name : c.usedById ? "طالب محذوف" : null,
      studentPhone: usedStudent ? usedStudent.phone : null,
      assignedStudentName: assignedStudent ? assignedStudent.name : null,
      assignedStudentPhone: assignedStudent ? assignedStudent.phone : null,
    };
  });

  return (
    <div className="max-w-7xl mx-auto">
      <CodesClient
        courses={courses}
        lectures={lectures}
        students={students}
        initialCodes={codesWithStudentDetails}
      />
    </div>
  );
}
