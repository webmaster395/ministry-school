"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createSession(formData: FormData) {
  const supabase = await createClient();

  const sessionType = formData.get("session_type") as string;
  const ministryId = formData.get("ministry_id") as string;
  const courseId = formData.get("course_id") as string;
  const teacherId = formData.get("teacher_id") as string;
  const sessionDate = formData.get("session_date") as string;
  const startTime = formData.get("start_time") as string;
  const endTime = formData.get("end_time") as string;
  const location = formData.get("location") as string;
  const room = formData.get("room") as string;
  const day = formData.get("day") as string;
  const description = formData.get("description") as string;

  const { error } = await supabase.from("sessions").insert({
    session_type: sessionType,
    ministry_id: sessionType === "commun" ? null : ministryId || null,
    course_id: courseId || null,
    teacher_id: teacherId || null,
    session_date: sessionDate,
    start_time: startTime,
    end_time: endTime,
    location,
    room: room || null,
    day,
    description: description || null,
  });

  if (error) {
    throw new Error("La création de la séance a échoué : " + error.message);
  }

  revalidatePath("/gestion/admin/seances");
  revalidatePath("/enseignant");
  revalidatePath("/etudiant");
}

export async function deleteSession(formData: FormData) {
  const supabase = await createClient();
  const sessionId = formData.get("session_id") as string;

  await supabase.from("sessions").delete().eq("id", sessionId);

  revalidatePath("/gestion/admin/seances");
  revalidatePath("/enseignant");
  revalidatePath("/etudiant");
}
