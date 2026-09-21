"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Enregistre la photo que la personne vient de déposer dans le stockage (dépôt fait depuis le navigateur). */
export async function setAvatar(path: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // On n'accepte qu'un fichier rangé dans le dossier de la personne
  if (!path.startsWith(`${user.id}/`)) throw new Error("Chemin de photo invalide");

  const { data: before } = await supabase.from("profiles").select("avatar_path").eq("id", user.id).single();
  const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", user.id);
  if (error) throw new Error("L'enregistrement de la photo a échoué : " + error.message);

  // Un changement de format (WebP / JPEG) ne doit pas laisser l'ancien fichier en stock
  const previous = before?.avatar_path as string | null | undefined;
  if (previous && previous !== path && previous.startsWith(`${user.id}/`)) {
    await supabase.storage.from("avatars").remove([previous]);
  }

  revalidatePath("/", "layout");
}

/** Retire la photo de la personne : fichier et référence. */
export async function clearAvatar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: profile } = await supabase.from("profiles").select("avatar_path").eq("id", user.id).single();
  if (profile?.avatar_path) {
    await supabase.storage.from("avatars").remove([profile.avatar_path as string]);
  }
  await supabase.from("profiles").update({ avatar_path: null }).eq("id", user.id);

  revalidatePath("/", "layout");
}
