"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  await supabase.from("materials").insert({
    session_id: sessionId,
    title,
    link_url: linkUrl || null,
    visible_at: visibleAtRaw ? new Date(visibleAtRaw).toISOString() : new Date().toISOString(),
    created_by: user.id,
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

  await supabase.from("materials").insert({
    session_id: sessionId,
    title,
    link_url: linkUrl || null,
    visible_at: new Date().toISOString(),
    created_by: user.id,
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
  const due = (formData.get("due_at") as string) ?? "";

  await supabase.from("assignments").insert({
    session_id: sessionId,
    instructions,
    created_by: user.id,
    kind: kind || null,
    duration_min: Number.isFinite(duration) && duration > 0 ? duration : null,
    due_at: due ? new Date(due).toISOString() : null,
  });

  revalidatePath("/enseignant/supports");
  revalidatePath("/etudiant", "layout");
}
