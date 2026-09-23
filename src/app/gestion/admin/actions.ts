"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Attribue les rôles d'un membre (ils se cumulent). La base refuse l'opération à qui n'est pas administrateur. */
export async function updateMember(formData: FormData) {
  const supabase = await createClient();
  const text = (key: string) => ((formData.get(key) as string) ?? "").trim();
  const on = (key: string) => formData.get(key) === "on";

  const { error } = await supabase.rpc("set_user_access", {
    target: text("user_id"),
    p_admin: on("is_admin"),
    p_teacher: on("is_teacher"),
    p_service_lead: on("is_service_lead"),
    p_project_lead: on("is_project_lead"),
    p_service: text("service_id") || null,
    p_ministry_lead: text("ministry_lead_of") || null,
  });
  if (error) throw new Error("L'attribution a échoué : " + error.message);

  revalidatePath("/gestion/admin");
  revalidatePath("/etudiant", "layout");
}

/** Active ou désactive un compte (connexion refusée tant qu'il est désactivé). */
export async function setMemberActive(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_active", {
    target: formData.get("user_id") as string,
    p_active: formData.get("active") === "1",
  });
  if (error) throw new Error(error.message);

  revalidatePath("/gestion/admin");
}

/** Donne accès à la vue d'un ministère à une adresse e-mail (le secrétaire du pasteur, par exemple). */
export async function addDelegate(formData: FormData) {
  const supabase = await createClient();
  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase();
  const ministryId = formData.get("ministry_id") as string;
  if (!email || !ministryId) return;

  const { data: emails } = await supabase.rpc("admin_user_emails");
  const existing = ((emails ?? []) as { id: string; email: string }[]).find(
    (u) => u.email.toLowerCase() === email
  );

  const { error } = await supabase.from("ministry_delegates").insert({
    ministry_id: ministryId,
    email,
    user_id: existing?.id ?? null,
  });
  if (error) throw new Error("L'ajout a échoué : " + error.message);

  revalidatePath("/gestion/admin");
}

export async function removeDelegate(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("ministry_delegates").delete().eq("id", formData.get("delegate_id") as string);
  revalidatePath("/gestion/admin");
}

/** Marque une question comme traitée, ou la remet « à traiter ». */
export async function setQuestionHandled(formData: FormData) {
  const supabase = await createClient();
  const handled = formData.get("handled") === "1";
  await supabase
    .from("questions")
    .update({ status: handled ? "traitee" : "nouvelle", handled_at: handled ? new Date().toISOString() : null })
    .eq("id", formData.get("question_id") as string);

  revalidatePath("/gestion/admin");
  revalidatePath("/etudiant/aide");
}

/** Retire la photo de profil d'un membre (modération) : fichier et référence. */
export async function removeMemberAvatar(formData: FormData) {
  const supabase = await createClient();
  const userId = formData.get("user_id") as string;
  const path = formData.get("path") as string;

  if (path) await supabase.storage.from("avatars").remove([path]);
  await supabase.from("profiles").update({ avatar_path: null }).eq("id", userId);

  revalidatePath("/gestion/admin");
}
