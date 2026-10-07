"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { invalidateStudentProgram } from "@/lib/cache/program";

async function adminClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Connexion requise.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Accès réservé aux administrateurs.");
  return supabase;
}

async function uploadPhoto(supabase: Awaited<ReturnType<typeof createClient>>, trainerId: string, photo: File | null) {
  if (!photo || photo.size === 0) return undefined;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type)) throw new Error("Format de photo non pris en charge.");
  if (photo.size > 5 * 1024 * 1024) throw new Error("La photo ne doit pas dépasser 5 Mo.");
  const path = `${trainerId}/portrait.webp`;
  const { error } = await supabase.storage.from("trainer-photos").upload(path, photo, { upsert: true, contentType: photo.type });
  if (error) throw new Error("L’envoi de la photo a échoué : " + error.message);
  return path;
}

export async function saveTrainer(formData: FormData) {
  const supabase = await adminClient();
  const id = String(formData.get("id") ?? "").trim();
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  if (!firstName) throw new Error("Le prénom est obligatoire.");

  const values = {
    first_name: firstName,
    last_name: lastName,
    title: String(formData.get("title") ?? "").trim() || null,
    bio: String(formData.get("bio") ?? "").trim() || null,
    is_active: formData.get("is_active") !== "0",
    updated_at: new Date().toISOString(),
  };

  let trainerId = id;
  if (id) {
    const { error } = await supabase.from("trainers").update(values).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase.from("trainers").insert(values).select("id").single();
    if (error || !data) throw new Error(error?.message ?? "Création impossible.");
    trainerId = data.id;
  }

  const photoPath = await uploadPhoto(supabase, trainerId, formData.get("photo") as File | null);
  if (photoPath) await supabase.from("trainers").update({ photo_path: photoPath, updated_at: new Date().toISOString() }).eq("id", trainerId);

  invalidateStudentProgram();
  revalidatePath("/gestion/admin");
  revalidatePath("/etudiant/seances", "layout");
  revalidatePath("/etudiant", "layout");
}

export async function setTrainerActive(formData: FormData) {
  const supabase = await adminClient();
  const id = String(formData.get("id") ?? "");
  const { error } = await supabase.from("trainers").update({ is_active: formData.get("active") === "1", updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  invalidateStudentProgram();
  revalidatePath("/gestion/admin");
  revalidatePath("/etudiant", "layout");
}
