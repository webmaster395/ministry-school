import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Point d'entrée unique de la preview, basé sur l'UUID fiable de Supabase Auth. */
export async function newCourseExperienceEnabled(supabase: SupabaseClient, userId: string) {
  if (process.env.NEW_COURSE_EXPERIENCE_ENABLED === "1") return true;

  const configured = (process.env.NEW_COURSE_EXPERIENCE_PREVIEW_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(userId);
  if (configured) return true;

  const { data } = await supabase.from("feature_preview_users").select("user_id").eq("feature_key", "new_course_experience").eq("user_id", userId).maybeSingle();
  return !!data;
}
