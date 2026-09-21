import { SupabaseClient } from "@supabase/supabase-js";

export type Parcours = {
  id: string;
  slug: string;
  title: string;
  description: string;
  period_label: string;
  schedule_label: string;
  planned_sessions: number;
  note: string | null;
};

/** Rattache une séance à un parcours d'après l'intitulé saisi dans `track`. */
export function parcoursSlugOf(track: string | null | undefined): string | null {
  const t = (track ?? "").toLowerCase();
  if (t.includes("cœur") || t.includes("coeur")) return "coeur";
  if (t.includes("caractère") || t.includes("caractere")) return "caractere";
  if (t.includes("sensibilité") || t.includes("sensibilite")) return "sensibilite";
  return null;
}

export async function getParcours(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("parcours")
    .select("id, slug, title, description, period_label, schedule_label, planned_sessions, note")
    .order("sort_order");
  return (data ?? []) as Parcours[];
}
