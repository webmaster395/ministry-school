"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DRAFTS_ENABLED } from "@/lib/drafts";
import { TYPES_ENABLED } from "@/lib/material-types";

/** Ajoute un support (lien ou fichier déposé) à une séance. La base vérifie le droit d'écriture. */
export async function addSupport(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const text = (key: string) => ((formData.get(key) as string) ?? "").trim();
  const sessionId = text("session_id");

  // Visibilité : tout de suite, au début du cours ou à sa fin
  const visibility = text("visibility");
  let visibleAt = new Date().toISOString();
  if (visibility === "start" || visibility === "end") {
    const { data: s } = await supabase.from("sessions").select("session_date, start_time, end_time").eq("id", sessionId).single();
    if (s) {
      const at = new Date(`${s.session_date}T${(visibility === "start" ? s.start_time : s.end_time).slice(0, 5)}:00`);
      if (!Number.isNaN(at.getTime())) visibleAt = at.toISOString();
    }
  }

  const { error } = await supabase.from("materials").insert({
    session_id: sessionId,
    title: text("title"),
    link_url: text("link_url") || null,
    visible_at: visibleAt,
    created_by: user.id,
    ...(TYPES_ENABLED && text("resource_type") ? { resource_type: text("resource_type") } : {}),
  });
  if (error) throw new Error("L'ajout du support a échoué : " + error.message);

  revalidatePath(`/gestion/enseignement/preparation/${sessionId}`);
  revalidatePath("/gestion/enseignement", "layout");
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

function refreshPrep(sessionId: string) {
  revalidatePath(`/gestion/enseignement/preparation/${sessionId}`);
  revalidatePath("/gestion/enseignement", "layout");
  revalidatePath("/gestion/pilotage");
  revalidatePath("/etudiant", "layout");
}

/** Ajoute un objectif (un par ligne dans la fiche du cours). */
export async function addObjective(formData: FormData) {
  const supabase = await createClient();
  const sessionId = ((formData.get("session_id") as string) ?? "").trim();
  const objective = ((formData.get("objective") as string) ?? "").trim();
  if (!objective) return;

  const { data: current } = await supabase.from("sessions").select("objectives").eq("id", sessionId).single();
  const existing = (current?.objectives ?? "").trim();
  const { data, error } = await supabase
    .from("sessions")
    .update({ objectives: existing ? `${existing}\n${objective}` : objective })
    .eq("id", sessionId)
    .select("id");
  if (error) throw new Error("L'ajout de l'objectif a échoué : " + error.message);
  if (!data?.length) throw new Error("Vous n'avez pas le droit de modifier ce cours.");
  refreshPrep(sessionId);
}

/** Retire l'objectif à la position donnée. */
export async function removeObjective(formData: FormData) {
  const supabase = await createClient();
  const sessionId = ((formData.get("session_id") as string) ?? "").trim();
  const index = parseInt((formData.get("index") as string) ?? "", 10);

  const { data: current } = await supabase.from("sessions").select("objectives").eq("id", sessionId).single();
  const lines = (current?.objectives ?? "").split("\n").map((l: string) => l.trim()).filter(Boolean);
  if (!Number.isInteger(index) || index < 0 || index >= lines.length) return;
  lines.splice(index, 1);
  const { data, error } = await supabase
    .from("sessions")
    .update({ objectives: lines.join("\n") || null })
    .eq("id", sessionId)
    .select("id");
  if (error) throw new Error("La suppression a échoué : " + error.message);
  if (!data?.length) throw new Error("Vous n'avez pas le droit de modifier ce cours.");
  refreshPrep(sessionId);
}

/** Supprime une consigne (avant ou après le cours). */
export async function deleteAssignment(formData: FormData) {
  const supabase = await createClient();
  const id = ((formData.get("id") as string) ?? "").trim();
  const sessionId = ((formData.get("session_id") as string) ?? "").trim();
  const { data, error } = await supabase.from("assignments").delete().eq("id", id).select("id");
  if (error) throw new Error("La suppression a échoué : " + error.message);
  if (!data?.length) throw new Error("Vous n'avez pas le droit de supprimer cet élément.");
  refreshPrep(sessionId);
}

/** Supprime un support de cours. */
export async function deleteSupport(formData: FormData) {
  const supabase = await createClient();
  const id = ((formData.get("id") as string) ?? "").trim();
  const sessionId = ((formData.get("session_id") as string) ?? "").trim();
  const { data, error } = await supabase.from("materials").delete().eq("id", id).select("id");
  if (error) throw new Error("La suppression a échoué : " + error.message);
  if (!data?.length) throw new Error("Vous n'avez pas le droit de supprimer ce support.");
  refreshPrep(sessionId);
}
