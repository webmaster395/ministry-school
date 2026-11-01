import { createClient } from "@/lib/supabase/server";

export type AppStatus = "draft" | "published" | "hidden";

export type CatalogApp = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  iconUrl: string | null;
  url: string;
  status: AppStatus;
  order: number;
  integrationKey: string | null;
};

const fallbackApps: CatalogApp[] = [
  { id: "ma-generosite", slug: "ma-generosite", name: "Ma générosité", description: "Explorez votre rapport à l'argent et au don.", category: "Finance", iconUrl: "/apps/ma-generosite.png", url: "https://generosite.jeveuxdonner.fr/", status: "published", order: 10, integrationKey: null },
  { id: "generopoly", slug: "generopoly", name: "Généropoly", description: "Le jeu où chaque choix compte.", category: "Finance", iconUrl: "/apps/generopoly.png", url: "/apps/generopoly", status: "published", order: 20, integrationKey: "generopoly" },
  { id: "profil-mapp", slug: "profil-mapp", name: "Profil MAPP", description: "Découvrez votre profil et votre manière de fonctionner.", category: "Identité", iconUrl: null, url: "/apps/profil-mapp", status: "published", order: 30, integrationKey: null },
];

type CatalogRow = {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  category: string;
  icon_url: string | null;
  destination_url: string;
  status: AppStatus;
  display_order: number;
  integration_key: string | null;
};

function mapRow(row: CatalogRow): CatalogApp {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.short_description,
    category: row.category,
    iconUrl: row.icon_url,
    url: row.destination_url,
    status: row.status,
    order: row.display_order,
    integrationKey: row.integration_key,
  };
}

export async function getCatalogApps({ includeUnpublished = false } = {}): Promise<CatalogApp[]> {
  const supabase = await createClient();
  let query = supabase.from("app_catalog").select("id,slug,name,short_description,category,icon_url,destination_url,status,display_order,integration_key");
  if (!includeUnpublished) query = query.eq("status", "published");
  const { data, error } = await query.order("display_order", { ascending: true }).order("name", { ascending: true });
  if (error) {
    if (!includeUnpublished) return fallbackApps;
    throw new Error(`Chargement du catalogue impossible : ${error.message}`);
  }
  return (data as CatalogRow[]).map(mapRow);
}

