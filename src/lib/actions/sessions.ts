"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Modifie une séance existante (date, horaire, lieu, titre, intervenant, parcours).
 * Réservé aux enseignants et aux administrateurs : c'est la base (RLS) qui décide,
 * cette action ne fait que transmettre la demande.
 */
export async function updateSession(formData: FormData) {
  const supabase = await createClient();

  const id = formData.get("session_id") as string;
  const text = (key: string) => ((formData.get(key) as string) ?? "").trim();

  // Les références bibliques ne sont modifiées que si le formulaire les propose
  const refs = formData.has("bible_refs") ? { bible_refs: text("bible_refs") || null } : {};

  // Type, ministère, cours et jour : seulement quand le formulaire les propose (administrateur)
  const admin: Record<string, string | null> = {};
  if (formData.has("session_type")) {
    const type = text("session_type");
    admin.session_type = type;
    admin.ministry_id = type === "commun" ? null : text("ministry_id") || null;
    admin.course_id = text("course_id") || null;
    admin.day = text("day") || "samedi";
  }

  const { error, data } = await supabase
    .from("sessions")
    .update({
      ...refs,
      ...admin,
      session_date: text("session_date"),
      start_time: text("start_time"),
      end_time: text("end_time"),
      location: text("location"),
      room: text("room") || null,
      description: text("description") || null,
      track: text("track") || null,
      speaker_name: text("speaker_name") || null,
      summary: text("summary") || null,
      objectives: text("objectives") || null,
    })
    .eq("id", id)
    .select("id");

  if (error) {
    throw new Error("La modification de la séance a échoué : " + error.message);
  }
  if (!data?.length) {
    throw new Error("Vous n'avez pas le droit de modifier cette séance.");
  }

  revalidatePath("/gestion/admin/seances");
  revalidatePath("/enseignant/seances");
  revalidatePath("/enseignant");
  revalidatePath("/gestion/enseignement/preparation", "layout");
  revalidatePath("/gestion/pilotage", "layout");
  revalidatePath("/gestion/enseignement", "layout");
  revalidatePath("/etudiant", "layout");
}

export type SessionSaveState = { ok: boolean; message: string } | null;

/** Même modification, mais avec un retour clair à l'écran (enregistré ou refusé) au lieu d'une page d'erreur. */
export async function updateSessionWithFeedback(_prev: SessionSaveState, formData: FormData): Promise<SessionSaveState> {
  try {
    await updateSession(formData);
    return { ok: true, message: "Modifications enregistrées." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "L'enregistrement a échoué." };
  }
}

/** Supprime une séance depuis sa fiche, puis revient au programme de l'administration. */
export async function deleteSessionFromCard(formData: FormData) {
  const supabase = await createClient();
  const id = ((formData.get("session_id") as string) ?? "").trim();
  const { data, error } = await supabase.from("sessions").delete().eq("id", id).select("id");
  if (error) throw new Error("La suppression a échoué : " + error.message);
  if (!data?.length) throw new Error("Vous n'avez pas le droit de supprimer cette séance.");
  revalidatePath("/gestion/admin", "layout");
  revalidatePath("/etudiant", "layout");
  redirect("/gestion/admin?onglet=programme");
}
