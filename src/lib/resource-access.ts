import type { SupabaseClient } from "@supabase/supabase-js";

export const RESOURCE_TYPES = ["app_catalog", "material", "opportunity_resource", "managed_resource"] as const;
export type ResourceAccessType = (typeof RESOURCE_TYPES)[number];

export const VISIBILITY_MODES = ["all_authenticated", "super_admin_only", "selected_lists", "selected_users"] as const;
export type ResourceVisibilityMode = (typeof VISIBILITY_MODES)[number];

export const LIST_CATEGORY_LABELS = {
  collaborators: "Collaborateurs",
  responsibilities: "Responsabilités",
  sensitivities: "Sensibilités",
  involvements: "Implications",
  other: "Autre",
} as const;
export type ListCategory = keyof typeof LIST_CATEGORY_LABELS;

const isMode = (value: string): value is ResourceVisibilityMode =>
  VISIBILITY_MODES.includes(value as ResourceVisibilityMode);

function uuidValues(formData: FormData, key: string) {
  return [...new Set(formData.getAll(key).map(String).filter((value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)))];
}

function categoryValues(formData: FormData, key: string) {
  return [...new Set(formData.getAll(key).map(String).filter((value): value is ListCategory => value in LIST_CATEGORY_LABELS))];
}

/**
 * Enregistre la règle uniquement après une décision explicite. Cette garde
 * permet aux ressources historiques sans règle de conserver leur visibilité.
 */
export async function saveResourceAccessFromForm(
  supabase: SupabaseClient,
  resourceType: ResourceAccessType,
  resourceId: string,
  formData: FormData,
) {
  if (formData.get("accessConfigured") !== "1") return;
  const rawMode = String(formData.get("accessMode") ?? "");
  if (!isMode(rawMode)) throw new Error("Mode de visibilité invalide.");

  const { error } = await supabase.rpc("save_resource_access", {
    p_resource_type: resourceType,
    p_resource_id: resourceId,
    p_visibility_mode: rawMode,
    p_list_ids: rawMode === "selected_lists" ? uuidValues(formData, "accessListIds") : [],
    p_categories: rawMode === "selected_lists" ? categoryValues(formData, "accessCategories") : [],
    p_user_ids: rawMode === "selected_users" ? uuidValues(formData, "accessUserIds") : [],
  });
  if (error) throw new Error(`Enregistrement des accès impossible : ${error.message}`);
}

