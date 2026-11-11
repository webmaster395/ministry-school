import "server-only";

import { createClient } from "@/lib/supabase/server";

export type HeroesMotorsResult = {
  firstName: string;
  portrait: string;
  motors: string[];
  heroes: string[];
  publishedAt: string;
};

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export async function getPublishedHeroesMotorsResult(userId: string): Promise<HeroesMotorsResult | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("heroes_motors_results")
    .select("first_name,portrait,motors,heroes,published_at")
    .eq("user_id", userId)
    .eq("publication_status", "published")
    .maybeSingle();

  // La migration peut ne pas encore être appliquée dans un environnement de
  // prévisualisation. Dans ce cas, Mon identité reste disponible sans ce post.
  if (error?.code === "42P01" || error?.code === "PGRST205") return null;
  if (error) throw new Error(`Chargement de Mes moteurs impossible : ${error.message}`);
  if (!data) return null;

  return {
    firstName: data.first_name,
    portrait: data.portrait,
    motors: stringArray(data.motors),
    heroes: stringArray(data.heroes),
    publishedAt: data.published_at ?? new Date().toISOString(),
  };
}
