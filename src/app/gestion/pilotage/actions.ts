"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DRAFTS_ENABLED } from "@/lib/drafts";

/** Ajoute un support (lien) à une séance du ministère piloté. La base vérifie le droit d'écriture. */
export async function addSupport(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const text = (key: string) => ((formData.get(key) as string) ?? "").trim();
  const sessionId = text("session_id");

  const { error } = await supabase.from("materials").insert({
    session_id: sessionId,
    title: text("title"),
    link_url: text("link_url") || null,
    created_by: user.id,
  });
  if (error) throw new Error("L'ajout du support a échoué : " + error.message);

  revalidatePath(`/gestion/enseignement/preparation/${sessionId}`);
  revalidatePath("/gestion/pilotage");
  revalidatePath("/etudiant", "layout");
}

/** Ajoute une consigne (« à préparer avant le cours »). */
export async function addPilotAssignment(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const text = (key: string) => ((formData.get(key) as string) ?? "").trim();
  const sessionId = text("session_id");
  const duration = parseInt(text("duration_min"), 10);
  const due = text("due_at");

  const { error } = await supabase.from("assignments").insert({
    session_id: sessionId,
    instructions: text("instructions"),
    created_by: user.id,
    kind: text("kind") || null,
    duration_min: Number.isFinite(duration) && duration > 0 ? duration : null,
    due_at: due ? new Date(due).toISOString() : null,
  });
  if (error) throw new Error("L'ajout de la consigne a échoué : " + error.message);

  revalidatePath(`/gestion/enseignement/preparation/${sessionId}`);
  revalidatePath("/gestion/pilotage");
  revalidatePath("/etudiant", "layout");
}

export type CourseFormState = { error?: string };

/** Ajoute un cours au programme d'un ministère piloté. La base vérifie le droit d'écriture. */
export async function createCourse(_prev: CourseFormState, formData: FormData): Promise<CourseFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Vous n'êtes plus connecté." };

  const text = (key: string) => ((formData.get(key) as string) ?? "").trim();
  const ministryId = text("ministry_id");
  const title = text("title");
  const date = text("session_date");
  const start = text("start_time");
  const end = text("end_time");
  const location = text("location");
  if (!ministryId || !title || !date || !start || !end || !location) {
    return { error: "Renseignez le titre, la date, les heures et le lieu." };
  }
  if (end <= start) return { error: "L'heure de fin doit être après l'heure de début." };
  const draft = DRAFTS_ENABLED && text("intent") === "draft";

  const { error } = await supabase.from("sessions").insert({
    session_type: "ministere",
    ministry_id: ministryId,
    session_date: date,
    start_time: start,
    end_time: end,
    location,
    room: text("room") || null,
    day: new Date(`${date}T12:00:00`).getDay() === 0 ? "dimanche" : "samedi",
    description: title,
    speaker_name: text("speaker_name") || null,
    summary: text("summary") || null,
    objectives: text("objectives") || null,
    ...(DRAFTS_ENABLED && { is_draft: draft }),
  });
  if (error) return { error: "Le cours n'a pas pu être créé : " + error.message };

  revalidatePath("/gestion/pilotage");
  revalidatePath("/etudiant", "layout");
  redirect("/gestion/pilotage?onglet=avenir");
}

/** Publie un brouillon : le cours devient visible des étudiants. */
export async function publishCourse(formData: FormData) {
  if (!DRAFTS_ENABLED) return;
  const supabase = await createClient();
  const sessionId = ((formData.get("session_id") as string) ?? "").trim();

  const { data, error } = await supabase.from("sessions").update({ is_draft: false }).eq("id", sessionId).select("id");
  if (error) throw new Error("La publication a échoué : " + error.message);
  if (!data?.length) throw new Error("Vous n'avez pas le droit de publier ce cours.");

  revalidatePath(`/gestion/enseignement/preparation/${sessionId}`);
  revalidatePath("/gestion/pilotage");
  revalidatePath("/etudiant", "layout");
}
