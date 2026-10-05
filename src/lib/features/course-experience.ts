import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CourseExperienceAccess = { enabled: boolean; preview: boolean };

/**
 * Point d'entrée unique de la nouvelle expérience.
 * Le déploiement est désormais global ; la variable à 0 fournit un coupe-circuit
 * immédiat sans modifier les droits d'accès ni les données des cours.
 */
export async function courseExperienceAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<CourseExperienceAccess> {
  if (process.env.NEW_COURSE_EXPERIENCE_ENABLED !== "0")
    return { enabled: true, preview: false };

  const configured = (process.env.NEW_COURSE_EXPERIENCE_PREVIEW_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(userId);
  if (configured) return { enabled: true, preview: true };

  const { data } = await supabase
    .from("feature_preview_users")
    .select("user_id")
    .eq("feature_key", "new_course_experience")
    .eq("user_id", userId)
    .maybeSingle();
  return { enabled: !!data, preview: !!data };
}

export async function newCourseExperienceEnabled(
  supabase: SupabaseClient,
  userId: string,
) {
  return (await courseExperienceAccess(supabase, userId)).enabled;
}
