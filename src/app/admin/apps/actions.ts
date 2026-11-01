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

function publicationDate(formData: FormData) {
  if (value(formData, "publicationMode", 20) !== "scheduled") return null;
  const raw = value(formData, "publicationDateTime", 40);
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
  const viewer = await requireSuperAdmin();
  const id = value(formData, "id", 100);
  const name = value(formData, "name", 100);
  const slug = id ? value(formData, "slug", 80) : slugify(name);
  const category = value(formData, "category", 80);
  const requestedStatus = value(formData, "status", 20);
  if (!name || !slug || !category || !["draft", "published", "disabled"].includes(requestedStatus)) throw new Error("Vérifiez les champs obligatoires.");
  const publishAt = publicationDate(formData);
  const status = requestedStatus === "published" && publishAt && new Date(publishAt).getTime() > Date.now() ? "scheduled" : requestedStatus;
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
    public_publish_at: checked(formData, "publicEnabled") ? publishAt : null,
    student_enabled: checked(formData, "studentEnabled"),
    student_publish_at: checked(formData, "studentEnabled") ? publishAt : null,
    archived_at: null,
    updated_by: viewer.id,
  };
  const supabase = await createClient();
  const mutation = id ? supabase.from("app_catalog").update(payload).eq("id", id) : supabase.from("app_catalog").insert(payload);
  const { data, error } = await mutation.select("slug").single();
  if (error) throw new Error(`Enregistrement impossible : ${error.message}`);
  revalidateCatalog();
  const requestedReturn = value(formData, "returnTo", 300);
  const returnTo = requestedReturn.startsWith("/admin/apps/") ? requestedReturn : `/admin/apps/${data.slug}/settings`;
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}saved=1`);
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

export async function moveCatalogApp(formData: FormData) {
  await requireSuperAdmin();
  const id = value(formData, "id", 100);
  const direction = value(formData, "direction", 10);
  if (!id || !["up", "down"].includes(direction)) throw new Error("Déplacement impossible.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("app_catalog").select("id").is("archived_at", null).order("display_order", { ascending: true }).order("name", { ascending: true });
  if (error) throw new Error(`Chargement de l’ordre impossible : ${error.message}`);
  const ids = (data ?? []).map((item) => item.id);
  const index = ids.indexOf(id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ids.length) redirect("/admin/apps");
  [ids[index], ids[target]] = [ids[target], ids[index]];
  const { error: reorderError } = await supabase.rpc("reorder_app_catalog", { p_ids: ids });
  if (reorderError) throw new Error(`Réorganisation impossible : ${reorderError.message}`);
  revalidateCatalog();
  redirect("/admin/apps?reordered=1");
}

export async function duplicateCatalogApp(formData: FormData) {
  const viewer = await requireSuperAdmin();
  const id = value(formData, "id", 100);
  if (!id) throw new Error("Application introuvable.");
  const supabase = await createClient();
  const { data: source, error } = await supabase.from("app_catalog").select("name,slug,short_description,category,icon_url,destination_url,display_order").eq("id", id).is("archived_at", null).single();
  if (error || !source) throw new Error(`Duplication impossible : ${error?.message ?? "application introuvable"}`);
  const suffix = crypto.randomUUID().slice(0, 8);
  const slug = `${source.slug.slice(0, 65)}-copie-${suffix}`;
  const { error: insertError } = await supabase.from("app_catalog").insert({
    slug,
    name: `${source.name} — copie`.slice(0, 100),
    short_description: source.short_description,
    category: source.category,
    icon_url: source.icon_url,
    destination_url: source.destination_url,
    status: "draft",
    display_order: source.display_order + 5,
    integration_key: null,
    public_enabled: false,
    public_publish_at: null,
    student_enabled: false,
    student_publish_at: null,
    updated_by: viewer.id,
  });
  if (insertError) throw new Error(`Duplication impossible : ${insertError.message}`);
  revalidateCatalog();
  redirect(`/admin/apps/${slug}/settings?duplicated=1`);
}

