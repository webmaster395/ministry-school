"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { invalidateStudentProgram } from "@/lib/cache/program";

const value = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

function refresh(sessionId: string) {
  invalidateStudentProgram();
  revalidatePath("/gestion/a-valider");
  revalidatePath(`/gestion/enseignement/preparation/${sessionId}`);
  revalidatePath(`/gestion/pilotage/preparation/${sessionId}`);
  revalidatePath("/gestion/pilotage", "layout");
  revalidatePath("/etudiant", "layout");
}

export async function submitMinistryCourseReview(formData: FormData) {
  const sessionId = value(formData, "session_id");
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_ministry_course_review", { p_session: sessionId });
  if (error) throw new Error(`La soumission a échoué : ${error.message}`);
  refresh(sessionId);
}

export async function decideMinistryCourseReview(formData: FormData) {
  const sessionId = value(formData, "session_id");
  const decision = value(formData, "decision");
  const mode = value(formData, "publish_mode") || null;
  const local = value(formData, "publication_at");
  const publicationAt = local ? new Date(local).toISOString() : null;
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_ministry_course", {
    p_session: sessionId,
    p_decision: decision,
    p_message: value(formData, "message") || null,
    p_publish_mode: mode,
    p_publish_at: publicationAt,
  });
  if (error) throw new Error(`La décision n'a pas été enregistrée : ${error.message}`);
  refresh(sessionId);
}

export async function addMinistryCourseAnnotation(formData: FormData) {
  const sessionId = value(formData, "session_id");
  const body = value(formData, "body");
  if (!body) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_ministry_course_annotation", { p_session: sessionId, p_body: body });
  if (error) throw new Error(`Le commentaire n'a pas été ajouté : ${error.message}`);
  refresh(sessionId);
}

export async function createMinistryCourseRevision(formData: FormData) {
  const sessionId = value(formData, "session_id");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("clone_ministry_course_revision", { p_session: sessionId });
  if (error || !data) throw new Error(`La nouvelle version n'a pas pu être créée : ${error?.message ?? "erreur inconnue"}`);
  redirect(`/gestion/pilotage/preparation/${data}`);
}
