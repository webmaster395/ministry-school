import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function courseNotesEnabled(
  supabase: SupabaseClient,
  userId: string,
) {
  if (process.env.COURSE_NOTES_ENABLED === "1") return true;
  const { data } = await supabase
    .from("feature_preview_users")
    .select("user_id")
    .eq("feature_key", "course_notes")
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}
