import "server-only";

import { createClient } from "@/lib/supabase/server";

export type HeroesMotorsResult = {
  id: string;
  firstName: string;
  communicationStatus: "authorized" | "refused";
  portrait: string | null;
  motors: string[];
  heroes: string[];
  publishedAt: string;
};

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export async function getPublishedHeroesMotorsResult(userId: string): Promise<HeroesMotorsResult | null> {
  // La RPC utilise auth.uid() côté base ; le paramètre conserve l'API explicite
  // des appelants et documente le propriétaire attendu sans être envoyé au SQL.
  void userId;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_heroes_motors_result");

  // La migration peut ne pas encore être appliquée dans un environnement de
  // prévisualisation. Dans ce cas, Mon identité reste disponible sans ce post.
  if (["42P01", "42883", "PGRST202", "PGRST205"].includes(error?.code ?? "")) return null;
  if (error) throw new Error(`Chargement de Mes moteurs impossible : ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    id: row.id,
    firstName: row.first_name,
    communicationStatus: row.communication_status === "refused" ? "refused" : "authorized",
    portrait: typeof row.portrait === "string" ? row.portrait : null,
    motors: stringArray(row.motors),
    heroes: stringArray(row.heroes),
    publishedAt: row.published_at ?? new Date().toISOString(),
  };
}
