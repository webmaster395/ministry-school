"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";

const value = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

async function requireSuperAdmin() {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin) throw new Error("Action réservée aux super administrateurs.");
  return viewer;
}
export async function createDeepeningFormation(formData: FormData) {
  const viewer = await requireSuperAdmin();
  const title = value(formData, "title");
  if (!title) throw new Error("Le titre est obligatoire.");
  const slugBase = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 55) || "approfondissement";
  const supabase = await createClient();
  const { data, error } = await supabase.from("formations").insert({
    category_key: "deepening",
    slug: `${slugBase}-${crypto.randomUUID().slice(0, 8)}`,
    title,
    description: value(formData, "description") || null,
    status: "draft",
    created_by: viewer.id,
  }).select("id").single();
  if (error || !data) throw new Error(`Création impossible : ${error?.message ?? "erreur inconnue"}`);
  revalidatePath("/gestion/formations", "layout");
  redirect(`/gestion/formations/${data.id}`);
}

export async function setFormationAssignment(formData: FormData) {
  await requireSuperAdmin();
  const supabase = await createClient();
  const formationId = value(formData, "formation_id");
  const userId = value(formData, "user_id");
  const role = value(formData, "role") === "responsible" ? "responsible" : "contributor";
  if (!formationId || !userId) throw new Error("Choisissez une personne.");
  const { error } = await supabase.from("formation_assignments").upsert({
    formation_id: formationId,
    user_id: userId,
    role,
    can_publish: role === "responsible" && value(formData, "can_publish") === "1",
  }, { onConflict: "formation_id,user_id" });
  if (error) throw new Error(`Attribution impossible : ${error.message}`);
  revalidatePath(`/gestion/formations/${formationId}`);
  revalidatePath("/gestion/formations", "layout");
}

export async function revokeFormationAssignment(formData: FormData) {
  await requireSuperAdmin();
  const supabase = await createClient();
  const formationId = value(formData, "formation_id");
  const userId = value(formData, "user_id");
  const { error } = await supabase.from("formation_assignments").delete().eq("formation_id", formationId).eq("user_id", userId);
  if (error) throw new Error(`Révocation impossible : ${error.message}`);
  revalidatePath(`/gestion/formations/${formationId}`);
  revalidatePath("/gestion/formations", "layout");
}

export async function enrollDeepeningStudent(formData: FormData) {
  const viewer = await requireSuperAdmin();
  const supabase = await createClient();
  const formationId = value(formData, "formation_id");
  const userIds = formData.getAll("user_id").map(String).filter(Boolean);
  if (!formationId || !userIds.length) throw new Error("Choisissez au moins un étudiant.");
  const rows = userIds.map((userId) => ({ formation_id: formationId, user_id: userId, status: "active", assigned_by: viewer.id, ended_at: null }));
  const { error } = await supabase.from("deepening_enrollments").upsert(rows, { onConflict: "formation_id,user_id" });
  if (error) throw new Error(`Inscription impossible : ${error.message}`);
  revalidatePath(`/gestion/formations/${formationId}`);
  revalidatePath("/etudiant/cours", "layout");
}

export async function setDeepeningAuthorization(formData: FormData) {
  const viewer = await requireSuperAdmin();
  const supabase = await createClient();
  const userId = value(formData, "user_id");
  const formationId = value(formData, "formation_id");
  const enabled = value(formData, "enabled") === "1";
  if (!userId) throw new Error("Étudiant introuvable.");
  const { error } = await supabase.from("deepening_access").upsert({
    user_id: userId,
    enabled,
    granted_by: viewer.id,
    granted_at: new Date().toISOString(),
    revoked_at: enabled ? null : new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw new Error(`Autorisation impossible : ${error.message}`);
  if (!enabled) {
    const { error: enrollmentError } = await supabase.from("deepening_enrollments")
      .update({ status: "removed", ended_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("status", "active");
    if (enrollmentError) throw new Error(`Retrait des inscriptions impossible : ${enrollmentError.message}`);
  }
  revalidatePath(formationId ? `/gestion/formations/${formationId}` : "/gestion/formations", "layout");
  revalidatePath("/etudiant/cours", "layout");
  revalidatePath("/etudiant/travail", "layout");
  revalidatePath("/etudiant/ressources", "layout");
}

export async function removeDeepeningStudent(formData: FormData) {
  await requireSuperAdmin();
  const supabase = await createClient();
  const formationId = value(formData, "formation_id");
  const userId = value(formData, "user_id");
  const { error } = await supabase.from("deepening_enrollments").update({ status: "removed", ended_at: new Date().toISOString() }).eq("formation_id", formationId).eq("user_id", userId);
  if (error) throw new Error(`Retrait impossible : ${error.message}`);
  revalidatePath(`/gestion/formations/${formationId}`);
  revalidatePath("/etudiant/cours", "layout");
}

export async function saveSessionAttendance(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer) throw new Error("Non authentifié.");
  const supabase = await createClient();
  const sessionId = value(formData, "session_id");
  const { data: canManage } = await supabase.rpc("can_manage_formation_session", { p_session: sessionId });
  if (!canManage) throw new Error("Vous n’avez pas le droit de renseigner ces présences.");
  const rows = [...formData.entries()].filter(([key]) => key.startsWith("attendance:")).map(([key, raw]) => ({
    session_id: sessionId,
    user_id: key.slice("attendance:".length),
    status: ["present", "absent"].includes(String(raw)) ? String(raw) : "unknown",
    recorded_by: viewer.id,
    recorded_at: new Date().toISOString(),
  }));
  if (!rows.length) return;
  const { error } = await supabase.from("session_attendance").upsert(rows, { onConflict: "session_id,user_id" });
  if (error) throw new Error(`Enregistrement impossible : ${error.message}`);
  revalidatePath(`/gestion/formations/${value(formData, "formation_id")}`);
  revalidatePath("/etudiant/cours", "layout");
}
