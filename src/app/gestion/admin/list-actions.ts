"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";
import { createClient } from "@/lib/supabase/server";

const CATEGORIES = new Set(["collaborators", "responsibilities", "sensitivities", "involvements", "other"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requireSuperAdmin() {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin || viewer.deactivated) throw new Error("Accès refusé.");
  return viewer;
}

const text = (formData: FormData, key: string, max: number) => String(formData.get(key) ?? "").trim().slice(0, max);
const uuid = (formData: FormData, key: string) => {
  const value = text(formData, key, 80);
  if (!UUID.test(value)) throw new Error("Liste invalide.");
  return value;
};

function refreshLists() {
  revalidatePath("/gestion/admin");
  revalidatePath("/admin/apps", "layout");
}

export async function createUserList(formData: FormData) {
  const viewer = await requireSuperAdmin();
  const name = text(formData, "name", 120);
  const description = text(formData, "description", 1000) || null;
  const category = text(formData, "category", 40);
  if (!name || !CATEGORIES.has(category)) throw new Error("Vérifiez le nom et la catégorie.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("user_lists").insert({ name, description, category, created_by: viewer.id }).select("id").single();
  if (error) throw new Error(error.code === "23505" ? "Une liste porte déjà ce nom." : `Création impossible : ${error.message}`);
  refreshLists();
  redirect(`/gestion/admin?onglet=listes&liste=${data.id}&created=1`);
}

export async function updateUserList(formData: FormData) {
  await requireSuperAdmin();
  const id = uuid(formData, "list_id");
  const name = text(formData, "name", 120);
  const description = text(formData, "description", 1000) || null;
  const category = text(formData, "category", 40);
  if (!name || !CATEGORIES.has(category)) throw new Error("Vérifiez le nom et la catégorie.");
  const supabase = await createClient();
  const { error } = await supabase.from("user_lists").update({ name, description, category }).eq("id", id);
  if (error) throw new Error(error.code === "23505" ? "Une liste porte déjà ce nom." : `Modification impossible : ${error.message}`);
  refreshLists();
}

export async function deleteUserList(formData: FormData) {
  await requireSuperAdmin();
  const id = uuid(formData, "list_id");
  const supabase = await createClient();
  const { error } = await supabase.from("user_lists").delete().eq("id", id);
  if (error) throw new Error(`Suppression impossible : ${error.message}`);
  refreshLists();
  redirect("/gestion/admin?onglet=listes&deleted=1");
}

export async function addUserListMembers(formData: FormData) {
  const viewer = await requireSuperAdmin();
  const listId = uuid(formData, "list_id");
  const ids = [...new Set(formData.getAll("member_ids").map(String).filter((id) => UUID.test(id)))];
  if (!ids.length) throw new Error("Sélectionnez au moins une personne.");
  const supabase = await createClient();
  const { data: activeProfiles } = await supabase.from("profiles").select("id").in("id", ids).eq("deactivated", false);
  const rows = (activeProfiles ?? []).map((profile) => ({ list_id: listId, user_id: profile.id, added_by: viewer.id }));
  if (!rows.length) throw new Error("Aucun compte actif sélectionné.");
  const { error } = await supabase.from("user_list_members").upsert(rows, { onConflict: "list_id,user_id", ignoreDuplicates: true });
  if (error) throw new Error(`Ajout impossible : ${error.message}`);
  refreshLists();
}

export async function removeUserListMember(formData: FormData) {
  await requireSuperAdmin();
  const listId = uuid(formData, "list_id");
  const userId = uuid(formData, "user_id");
  const supabase = await createClient();
  const { error } = await supabase.from("user_list_members").delete().eq("list_id", listId).eq("user_id", userId);
  if (error) throw new Error(`Retrait impossible : ${error.message}`);
  refreshLists();
}

