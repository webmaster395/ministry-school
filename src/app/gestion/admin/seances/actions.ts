"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";
import { invalidateStudentProgram } from "@/lib/cache/program";

export async function createQuickCourse(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer?.roles.admin) throw new Error("Accès réservé aux administrateurs.");
  const supabase = await createClient();
  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const title = text("title");
  const date = text("session_date");
  const start = text("start_time");
  const end = text("end_time");
  const track = text("track");
  const trainerId = text("trainer_id");
  const location = text("location");
  const room = text("room");
  const trainerRequired = track !== "Services & Projets";
  if (!title || !date || !start || !end || !track || (trainerRequired && !trainerId) || !location) throw new Error("Complétez les informations obligatoires.");
  if (end <= start) throw new Error("L’heure de fin doit être après l’heure de début.");

  const { data: course, error: courseError } = await supabase.from("courses").insert({ title }).select("id").single();
  if (courseError || !course) throw new Error(courseError?.message ?? "Création du cours impossible.");
  const { data: trainer } = trainerId
    ? await supabase.from("trainers").select("id, profile_id").eq("id", trainerId).single()
    : { data: null };

  const ministryId = track === "Sensibilité ministérielle" ? text("ministry_id") || null : null;
  const { data: session, error: sessionError } = await supabase.from("sessions").insert({
    session_type: ministryId ? "ministere" : "commun",
    ministry_id: ministryId,
    service_id: track === "Services & Projets" ? text("service_id") || null : null,
    course_id: course.id,
    teacher_id: trainer?.profile_id ?? null,
    session_date: date,
    start_time: start,
    end_time: end,
    location,
    room: room || null,
    day: new Date(`${date}T12:00:00`).getDay() === 0 ? "dimanche" : "samedi",
    description: title,
    track,
    speaker_name: null,
    show_parking_notice: text("show_parking_notice") === "1",
  }).select("id").single();
  if (sessionError || !session) {
    await supabase.from("courses").delete().eq("id", course.id);
    throw new Error(sessionError?.message ?? "Création de la séance impossible.");
  }
  if (trainerId) {
    const { error: linkError } = await supabase.from("session_trainers").insert({ session_id: session.id, trainer_id: trainerId, position: 0 });
    if (linkError) throw new Error(linkError.message);
  }

  invalidateStudentProgram();

  revalidatePath("/gestion/admin", "layout");
  revalidatePath("/etudiant", "layout");
  redirect(`/gestion/admin/seances/${session.id}`);
}

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
  const text = (key: string) => ((formData.get(key) as string) ?? "").trim() || null;

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
    description: description?.trim() || null,
    track: text("track"),
    speaker_name: text("speaker_name"),
    summary: text("summary"),
    objectives: text("objectives"),
    bible_refs: text("bible_refs"),
    show_parking_notice: formData.getAll("show_parking_notice").includes("1"),
  });

  if (error) {
    throw new Error("La création de la séance a échoué : " + error.message);
  }

  invalidateStudentProgram();

  revalidatePath("/gestion/admin/seances");
  revalidatePath("/enseignant");
  revalidatePath("/etudiant");
}

export async function deleteSession(formData: FormData) {
  const supabase = await createClient();
  const sessionId = formData.get("session_id") as string;

  await supabase.from("sessions").delete().eq("id", sessionId);

  invalidateStudentProgram();

  revalidatePath("/gestion/admin/seances");
  revalidatePath("/enseignant");
  revalidatePath("/etudiant");
}
