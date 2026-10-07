"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyCourseContent } from "@/lib/course-notifications";

export async function addMaterial(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const sessionId = formData.get("session_id") as string;
  const title = formData.get("title") as string;
  const linkUrl = formData.get("link_url") as string;
  const visibleAtRaw = formData.get("visible_at") as string;

  const { data: material, error } = await supabase.from("materials").insert({
    session_id: sessionId,
    title,
    link_url: linkUrl || null,
    visible_at: visibleAtRaw ? new Date(visibleAtRaw).toISOString() : new Date().toISOString(),
    created_by: user.id,
  }).select("id").single();
  if (error) throw new Error("L'ajout du support a échoué : " + error.message);
  await notifyCourseContent({
    supabase,
    actorId: user.id,
    sessionId,
    targetId: material?.id,
    contentTitle: title,
  });

  revalidatePath("/enseignant/supports");
  revalidatePath("/etudiant", "layout");
}

export async function shareNow(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const sessionId = formData.get("session_id") as string;
  const title = formData.get("title") as string;
  const linkUrl = formData.get("link_url") as string;

  const { data: material, error } = await supabase.from("materials").insert({
    session_id: sessionId,
    title,
    link_url: linkUrl || null,
    visible_at: new Date().toISOString(),
    created_by: user.id,
  }).select("id").single();
  if (error) throw new Error("L'ajout du support a échoué : " + error.message);
  await notifyCourseContent({
    supabase,
    actorId: user.id,
    sessionId,
    targetId: material?.id,
    contentTitle: title,
  });

  revalidatePath("/enseignant/supports");
  revalidatePath("/etudiant/cours");
}

export async function addAssignment(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const sessionId = formData.get("session_id") as string;
  const instructions = formData.get("instructions") as string;

  const kind = ((formData.get("kind") as string) ?? "").trim();
  const duration = parseInt((formData.get("duration_min") as string) ?? "", 10);
  const { error } = await supabase.from("assignments").insert({
    session_id: sessionId,
    instructions,
    created_by: user.id,
    kind: kind || null,
    duration_min: Number.isFinite(duration) && duration > 0 ? duration : null,
    phase: "before",
    due_at: null,
  });
  if (error) throw new Error("L'ajout du travail a échoué : " + error.message);

  revalidatePath("/enseignant/supports");
  revalidatePath("/etudiant", "layout");
}
