"use server";

import { revalidatePath } from "next/cache";
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

  const { error, data } = await supabase
    .from("sessions")
    .update({
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
      bible_refs: text("bible_refs") || null,
    })
    .eq("id", id)
    .select("id");

  if (error) {
    throw new Error("La modification de la séance a échoué : " + error.message);
  }
  if (!data?.length) {
    throw new Error("Vous n'avez pas le droit de modifier cette séance.");
  }

  revalidatePath("/admin/seances");
  revalidatePath("/enseignant/seances");
  revalidatePath("/enseignant");
  revalidatePath("/etudiant/preparation", "layout");
  revalidatePath("/etudiant/pilotage", "layout");
  revalidatePath("/etudiant/enseignement", "layout");
  revalidatePath("/etudiant", "layout");
}
