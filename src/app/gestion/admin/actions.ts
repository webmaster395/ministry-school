"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";

async function assertSuperAdmin() {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin) throw new Error("Action réservée à la Super administration.");
}

async function assertAdmin() {
  const viewer = await getViewer();
  if (!viewer?.roles.admin) throw new Error("Action réservée à l’administration.");
}

export type MemberActionResult = {
  success?: boolean;
  error?: string | null;
};

/** Attribue les rôles d'un membre (ils se cumulent). La base refuse l'opération à qui n'est pas administrateur. */
export async function updateMember(
  prevStateOrFormData: MemberActionResult | FormData,
  maybeFormData?: FormData
): Promise<MemberActionResult> {
  await assertSuperAdmin();
  const data = (maybeFormData instanceof FormData ? maybeFormData : prevStateOrFormData) as FormData;
  const supabase = await createClient();
  const text = (key: string) => ((data.get(key) as string) ?? "").trim();
  const on = (key: string) => data.get(key) === "on";

  const { error } = await supabase.rpc("set_user_access_v2", {
    target: text("user_id"),
    p_admin: on("is_admin"),
    p_projects_training: on("is_projects_training_member"),
    p_service: text("service_id") || null,
    p_ministry_lead: text("ministry_lead_of") || null,
  });
  if (error) {
    return { success: false, error: "L'attribution a échoué : " + error.message };
  }

  revalidatePath("/gestion/admin");
  revalidatePath("/gestion/super-admin/roles");
  revalidatePath("/etudiant", "layout");
  return { success: true };
}

/** Active ou désactive un compte (connexion refusée tant qu'il est désactivé). */
export async function setMemberActive(
  prevStateOrFormData: MemberActionResult | FormData,
  maybeFormData?: FormData
): Promise<MemberActionResult> {
  const data = (maybeFormData instanceof FormData ? maybeFormData : prevStateOrFormData) as FormData;
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_active", {
    target: data.get("user_id") as string,
    p_active: data.get("active") === "1",
  });
  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/gestion/admin");
  revalidatePath("/gestion/super-admin/roles");
  return { success: true };
}

/** Affecte un contributeur ministériel en lecture seule par défaut. */
export async function addDelegate(formData: FormData) {
  await assertSuperAdmin();
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
    can_edit: false,
  });
  if (error) throw new Error("L'ajout a échoué : " + error.message);

  revalidatePath("/gestion/admin");
  revalidatePath("/gestion/super-admin/roles");
}

export async function removeDelegate(formData: FormData) {
  await assertSuperAdmin();
  const supabase = await createClient();
  await supabase.from("ministry_delegates").delete().eq("id", formData.get("delegate_id") as string);
  revalidatePath("/gestion/admin");
  revalidatePath("/gestion/super-admin/roles");
}

/** Enregistre une note interne à la page Rôles, sans créer de notification. */
export async function saveMemberRoleComment(
  prevStateOrFormData: MemberActionResult | FormData,
  maybeFormData?: FormData
): Promise<MemberActionResult> {
  await assertAdmin();
  const data = (maybeFormData instanceof FormData ? maybeFormData : prevStateOrFormData) as FormData;
  const userId = String(data.get("user_id") ?? "");
  const comment = String(data.get("comment") ?? "").trim().slice(0, 2000);
  const viewer = await getViewer();
  if (!userId || !viewer) return { success: false, error: "Membre introuvable." };

  const supabase = await createClient();
  const { error } = await supabase.from("admin_member_role_notes").upsert({
    user_id: userId,
    comment,
    updated_by: viewer.id,
    updated_at: new Date().toISOString(),
  });
  if (error) return { success: false, error: "Le commentaire n’a pas pu être enregistré." };

  revalidatePath("/gestion/admin");
  revalidatePath("/gestion/super-admin/roles");
  return { success: true };
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
export async function removeMemberAvatar(
  prevStateOrFormData: MemberActionResult | FormData,
  maybeFormData?: FormData
): Promise<MemberActionResult> {
  const data = (maybeFormData instanceof FormData ? maybeFormData : prevStateOrFormData) as FormData;
  const supabase = await createClient();
  const userId = data.get("user_id") as string;
  const path = data.get("path") as string;

  if (path) await supabase.storage.from("avatars").remove([path]);
  const { error } = await supabase.from("profiles").update({ avatar_path: null }).eq("id", userId);
  if (error) return { success: false, error: error.message };

  revalidatePath("/gestion/admin");
  return { success: true };
}
