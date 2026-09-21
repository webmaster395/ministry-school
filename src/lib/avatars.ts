import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Adresses temporaires (1 heure) pour afficher des photos de profil privées.
 * La base ne les délivre qu'à la personne, à l'administrateur et au personnel concerné :
 * pour tout autre, la liste revient simplement vide et on affiche l'initiale.
 */
export async function signedAvatarUrls(
  supabase: SupabaseClient,
  paths: (string | null | undefined)[]
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  const urls = new Map<string, string>();
  if (!unique.length) return urls;

  const { data } = await supabase.storage.from("avatars").createSignedUrls(unique, 3600);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return urls;
}
