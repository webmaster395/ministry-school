import "server-only";
import { getViewer } from "@/lib/data/viewer";
import { createClient } from "@/lib/supabase/server";

export type HeroesAdminRow = {
  id: string; userId: string | null; email: string | null; firstName: string;
  portrait: string | null; motors: string[]; heroes: string[];
  communication: "authorized" | "refused" | "unknown"; visible: boolean;
  assignment: "assigned" | "unassigned" | "anomaly"; anomalies: string[];
  publication: "draft" | "published" | "archived"; updatedAt: string;
};
export type HeroesAccount = { userId: string; email: string; fullName: string; deactivated: boolean };

function strings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && !!item.trim()) : []; }

export async function getHeroesAdminData() {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin || viewer.deactivated) throw new Error("Accès refusé.");
  const supabase = await createClient();
  const [{ data: rawRows, error }, { data: rawAccounts, error: accountError }] = await Promise.all([
    supabase.from("heroes_motors_results").select("id,user_id,source_email,first_name,portrait,motors,heroes,communication_status,visible,assignment_status,anomalies,publication_status,updated_at").order("updated_at", { ascending: false }),
    supabase.rpc("heroes_motors_admin_accounts"),
  ]);
  if (error) throw new Error(`Chargement des résultats impossible : ${error.message}`);
  if (accountError) throw new Error(`Chargement des comptes impossible : ${accountError.message}`);
  const accounts: HeroesAccount[] = (rawAccounts ?? []).map((row: Record<string, unknown>) => ({ userId: String(row.user_id), email: String(row.email ?? ""), fullName: String(row.full_name ?? ""), deactivated: Boolean(row.deactivated) }));
  const byId = new Map(accounts.map((account) => [account.userId, account]));
  const rows: HeroesAdminRow[] = (rawRows ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id), userId: typeof row.user_id === "string" ? row.user_id : null,
    email: typeof row.source_email === "string" ? row.source_email : null,
    firstName: String(row.first_name ?? byId.get(String(row.user_id))?.fullName ?? ""),
    portrait: typeof row.portrait === "string" ? row.portrait : null,
    motors: strings(row.motors), heroes: strings(row.heroes),
    communication: row.communication_status === "refused" ? "refused" : row.communication_status === "authorized" ? "authorized" : "unknown",
    visible: Boolean(row.visible), assignment: row.assignment_status === "assigned" ? "assigned" : row.assignment_status === "anomaly" ? "anomaly" : "unassigned",
    anomalies: strings(row.anomalies), publication: row.publication_status === "published" ? "published" : row.publication_status === "archived" ? "archived" : "draft",
    updatedAt: String(row.updated_at ?? ""),
  }));
  return { rows, accounts };
}

const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function normalizedHero(value: string) { const key = fold(value); return /^(jesus|jesus christ|jesus christ de nazareth)$/.test(key) ? "Jésus-Christ" : value.trim(); }
function rank(values: string[][], limit: number, normalize: (value: string) => string) {
  const counts = new Map<string, number>();
  for (const group of values) for (const raw of new Set(group.map(normalize).filter(Boolean))) counts.set(raw, (counts.get(raw) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr")).slice(0, limit).map(([label, count]) => ({ label, count }));
}
export function heroesStatistics(rows: HeroesAdminRow[]) {
  const communicable = rows.filter((row) => row.communication === "authorized" && row.publication !== "archived");
  return {
    total: rows.length, assigned: rows.filter((row) => row.assignment === "assigned").length,
    visible: rows.filter((row) => row.visible && row.publication === "published").length,
    disabled: rows.filter((row) => !row.visible || row.publication !== "published").length,
    refused: rows.filter((row) => row.communication === "refused").length,
    unassigned: rows.filter((row) => row.assignment !== "assigned").length,
    denominator: communicable.length,
    heroes: rank(communicable.map((row) => row.heroes), 5, normalizedHero),
    motors: rank(communicable.map((row) => row.motors), 10, (value) => value.trim()),
  };
}
