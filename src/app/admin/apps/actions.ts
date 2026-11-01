"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";
import { parisLocalToIso } from "@/lib/availability";
import { createClient } from "@/lib/supabase/server";

async function requireSuperAdmin() {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin || viewer.deactivated) throw new Error("Accès refusé.");
  return viewer;
}

function value(formData: FormData, key: string, max = 500) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function validUrl(raw: string) {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("L’URL doit utiliser http ou https.");
  return url.toString();
}

function slugify(raw: string) {
  return raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function publicationDate(formData: FormData, prefix: "public" | "student") {
  if (value(formData, `${prefix}Mode`, 20) !== "scheduled") return null;
  const raw = value(formData, `${prefix}DateTime`, 40);
  const [date, time] = raw.split("T");
  return parisLocalToIso(date, time);
}

function revalidateCatalog() {
  revalidatePath("/apps");
  revalidatePath("/etudiant/outils");
  revalidatePath("/etudiant", "layout");
  revalidatePath("/gestion", "layout");
  revalidatePath("/admin/apps");
}

async function uploadIcon(file: File, slug: string) {
  if (!file.size) return null;
  if (file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp", "image/svg+xml"].includes(file.type)) throw new Error("L’icône doit être une image JPG, PNG, WebP ou SVG de moins de 5 Mo.");
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const path = `${slug}/${crypto.randomUUID()}.${extension}`;
  const supabase = await createClient();
  const { error } = await supabase.storage.from("app-icons").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Import de l’icône impossible : ${error.message}`);
  return supabase.storage.from("app-icons").getPublicUrl(path).data.publicUrl;
}

export async function saveCatalogApp(formData: FormData) {
  await requireSuperAdmin();
  const id = value(formData, "id", 100);
  const name = value(formData, "name", 100);
  const slug = id ? value(formData, "slug", 80) : slugify(name);
  const category = value(formData, "category", 80);
  const status = value(formData, "status", 20);
  if (!name || !slug || !category || !["draft", "scheduled", "published", "disabled"].includes(status)) throw new Error("Vérifiez les champs obligatoires.");
  const currentIcon = value(formData, "currentIcon", 1000) || null;
  const file = formData.get("icon");
  const iconUrl = file instanceof File && file.size ? await uploadIcon(file, slug) : currentIcon;
  const payload = {
    slug,
    name,
    short_description: value(formData, "description", 240),
    category,
    icon_url: iconUrl,
    destination_url: validUrl(value(formData, "url", 1000)),
    status,
    display_order: Number.parseInt(value(formData, "order", 8), 10) || 0,
    integration_key: value(formData, "integrationKey", 80) || null,
    public_enabled: checked(formData, "publicEnabled"),
    public_publish_at: publicationDate(formData, "public"),
    student_enabled: checked(formData, "studentEnabled"),
    student_publish_at: publicationDate(formData, "student"),
    archived_at: null,
  };
  const supabase = await createClient();
  const mutation = id ? supabase.from("app_catalog").update(payload).eq("id", id) : supabase.from("app_catalog").insert(payload);
  const { error } = await mutation;
  if (error) throw new Error(`Enregistrement impossible : ${error.message}`);
  revalidateCatalog();
  redirect("/admin/apps?saved=1");
}

export async function deleteCatalogApp(formData: FormData) {
  const viewer = await requireSuperAdmin();
  const id = value(formData, "id", 100);
  if (!id) throw new Error("Application introuvable.");
  const supabase = await createClient();
  const { error } = await supabase.from("app_catalog").update({
    archived_at: new Date().toISOString(),
    status: "disabled",
    public_enabled: false,
    student_enabled: false,
    updated_by: viewer.id,
  }).eq("id", id);
  if (error) throw new Error(`Archivage du catalogue impossible : ${error.message}`);
  revalidateCatalog();
  redirect("/admin/apps?archived=1");
}

export async function restoreCatalogApp(formData: FormData) {
  const viewer = await requireSuperAdmin();
  const id = value(formData, "id", 100);
  if (!id) throw new Error("Application introuvable.");
  const supabase = await createClient();
  const { error } = await supabase.from("app_catalog").update({
    archived_at: null,
    status: "draft",
    updated_by: viewer.id,
  }).eq("id", id);
  if (error) throw new Error(`Restauration impossible : ${error.message}`);
  revalidateCatalog();
  redirect("/admin/apps?restored=1");
}

export async function setCatalogAppStatus(formData: FormData) {
  const viewer = await requireSuperAdmin();
  const id = value(formData, "id", 100);
  const status = value(formData, "nextStatus", 20);
  if (!id || !["published", "disabled"].includes(status)) throw new Error("Action impossible.");
  const supabase = await createClient();
  const { error } = await supabase.from("app_catalog").update({ status, updated_by: viewer.id }).eq("id", id).is("archived_at", null);
  if (error) throw new Error(`Changement de statut impossible : ${error.message}`);
  revalidateCatalog();
  redirect(`/admin/apps?status=${status}`);
}

export async function saveStudentToolsSetting(formData: FormData) {
  const viewer = await requireSuperAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("app_studio_settings").update({
    student_tools_enabled: checked(formData, "studentToolsEnabled"),
    updated_at: new Date().toISOString(),
    updated_by: viewer.id,
  }).eq("singleton", true);
  if (error) throw new Error(`Réglage impossible : ${error.message}`);
  revalidateCatalog();
  redirect("/admin/apps?settings=1");
}

