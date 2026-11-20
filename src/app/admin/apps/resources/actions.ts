"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";
import { createClient } from "@/lib/supabase/server";

const text = (f: FormData, k: string, n = 3000) => String(f.get(k) ?? "").trim().slice(0, n);
const checked = (f: FormData, k: string) => f.get(k) === "on";
const list = (f: FormData, k: string) => text(f, k).split(/[\n,]/).map((v) => v.trim()).filter(Boolean);
const ids = (f: FormData, k: string) => f
  .getAll(k)
  .flatMap((value) => String(value).split(/[\n,]/))
  .map((value) => value.trim())
  .filter((value) => /^[0-9a-f-]{36}$/i.test(value));

export async function saveManagedResource(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin || viewer.deactivated) throw new Error("Accès refusé.");
  const supabase = await createClient();
  const id = text(formData, "id", 80);
  let filePath = text(formData, "currentFilePath", 500) || null;
  let fileName = text(formData, "currentFileName", 300) || null;
  let mimeType = text(formData, "currentMimeType", 200) || null;
  let fileSize = Number(text(formData, "currentFileSize", 30)) || null;
  const file = formData.get("file");
  if (file instanceof File && file.size) {
    if (file.size > 50 * 1024 * 1024) throw new Error("Le fichier dépasse 50 Mo.");
    filePath = `${viewer.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-z0-9._-]/gi, "-")}`;
    const { error } = await supabase.storage.from("managed-resources").upload(filePath, file, { contentType: file.type });
    if (error) throw new Error(`Import impossible : ${error.message}`);
    fileName = file.name; mimeType = file.type; fileSize = file.size;
  }
  const externalUrl = text(formData, "externalUrl", 1200) || null;
  if (!filePath && !externalUrl) throw new Error("Ajoutez un fichier ou une URL.");
  const payload = {
    title: text(formData, "title", 180), description: text(formData, "description") || null,
    kind: text(formData, "kind", 30), external_url: externalUrl, file_path: filePath, file_name: fileName, mime_type: mimeType, file_size: fileSize,
    thumbnail_url: text(formData, "thumbnailUrl", 1200) || null, category: text(formData, "category", 100) || null, tags: list(formData, "tags"),
    placements: formData.getAll("placements").map(String), session_ids: ids(formData, "sessionIds"), opportunity_ids: ids(formData, "opportunityIds"),
    access_scope: text(formData, "accessScope", 30), allowed_user_ids: ids(formData, "allowedUsers"), allowed_ministry_ids: ids(formData, "allowedMinistries"), attendance_session_id: text(formData, "attendanceSessionId", 80) || null,
    status: text(formData, "status", 30), publish_at: text(formData, "publishAt", 60) || null,
    featured: checked(formData, "featured"), featured_start_at: text(formData, "featuredStart", 60) || null, featured_end_at: text(formData, "featuredEnd", 60) || null,
    updated_by: viewer.id, ...(id ? {} : { created_by: viewer.id }),
  };
  if (!payload.title) throw new Error("Le titre est obligatoire.");
  const mutation = id ? supabase.from("managed_resources").update(payload).eq("id", id) : supabase.from("managed_resources").insert(payload);
  const { data, error } = await mutation.select("id").single();
  if (error) throw new Error(`Enregistrement impossible : ${error.message}`);
  revalidatePath("/gestion/admin"); revalidatePath("/etudiant/ressources"); revalidatePath("/etudiant");
  redirect(`/admin/apps/resources/${data.id}?saved=1`);
}

export async function resetFeaturedResource(formData: FormData) {
  const viewer = await getViewer(); if (!viewer?.roles.superAdmin) throw new Error("Accès refusé.");
  const id = text(formData, "id", 80); const supabase = await createClient();
  const { data } = await supabase.from("managed_resources").select("featured_generation").eq("id", id).single();
  const { error } = await supabase.from("managed_resources").update({ featured_generation: (data?.featured_generation || 1) + 1, updated_by: viewer.id }).eq("id", id);
  if (error) throw new Error(error.message); revalidatePath("/etudiant"); redirect(`/admin/apps/resources/${id}?reset=1`);
}
