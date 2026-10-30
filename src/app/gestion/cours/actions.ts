"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { invalidateStudentProgram } from "@/lib/cache/program";

export type CourseCreationState = { error?: string };

const text = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();
const lines = (formData: FormData, key: string) =>
  formData
    .getAll(key)
    .map((value) => String(value).trim())
    .filter(Boolean)
    .join("\n");
const inlineItems = (formData: FormData, key: string) =>
  formData
    .getAll(key)
    .map((value) => String(value).trim())
    .filter(Boolean)
    .join(" • ");

/**
 * Point d'entrée unique pour les cours classiques, ministériels et ceux rattachés
 * à une initiative. L'autorisation et le rattachement sont revérifiés dans la RPC.
 */
export async function createCourseDraft(
  _previous: CourseCreationState,
  formData: FormData,
): Promise<CourseCreationState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Votre session a expiré. Reconnectez-vous puis réessayez." };

  const context = text(formData, "creation_context");
  const parentId = text(formData, "parent_id") || null;
  const title = text(formData, "title");
  const date = text(formData, "session_date");
  const location = text(formData, "location");
  if (!title || !date || !location) {
    return { error: "Renseignez le titre, la date et le lieu avant de continuer." };
  }

  const payload = {
    title,
    session_date: date,
    start_time: text(formData, "start_time"),
    end_time: text(formData, "end_time"),
    location,
    room: text(formData, "room") || null,
    track: text(formData, "track") || null,
    ministry_id: text(formData, "ministry_id") || null,
    trainer_id: text(formData, "trainer_id") || null,
    speaker_name: inlineItems(formData, "speaker_items") || text(formData, "speaker_name") || null,
    summary: text(formData, "summary") || null,
    objectives: lines(formData, "objective_items") || text(formData, "objectives") || null,
    bible_refs: text(formData, "bible_refs") || null,
    show_parking_notice: formData.getAll("show_parking_notice").includes("1"),
  };

  const { data: sessionId, error } = await supabase.rpc("create_course_draft", {
    p_context: context,
    p_parent: parentId,
    p_payload: payload,
  });
  if (error || !sessionId) {
    const message = error?.message ?? "Création impossible.";
    if (message.includes("INVALID_MINISTRY_TRAINING_DAY")) {
      return { error: "Choisissez un samedi à partir de janvier pour ce cours ministériel." };
    }
    if (message.includes("FORBIDDEN")) {
      return { error: "Vous n'avez pas l'autorisation de créer ce cours dans cet espace." };
    }
    return { error: `Le brouillon n'a pas pu être créé : ${message}` };
  }

  invalidateStudentProgram();
  revalidatePath("/gestion/admin", "layout");
  revalidatePath("/gestion/pilotage", "layout");
  revalidatePath("/gestion/projets-formations", "layout");

  if (context === "ministry") redirect(`/gestion/pilotage/preparation/${sessionId}`);
  if (context === "opportunity" && parentId) {
    redirect(`/gestion/projets-formations/${parentId}/cours/${sessionId}`);
  }
  redirect(`/gestion/admin/seances/${sessionId}`);
}
