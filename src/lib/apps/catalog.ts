import { createClient } from "@/lib/supabase/server";
import { unstable_cache } from "next/cache";
import { STUDENT_TOOLS_SETTINGS_CACHE_TAG } from "@/lib/cache/apps";
import { createServiceClient } from "@/lib/supabase/service";

export type AppStatus = "draft" | "scheduled" | "published" | "disabled";
export type CatalogChannel = "public" | "student" | "admin";

// La publication dans App Studio est désormais la source de vérité. Un outil
// publié pour les étudiants ne doit plus être masqué par une seconde liste
// codée en dur dans le portail.
const temporarilyHiddenPortalSlugs = new Set<string>();

export function isToolVisibleInPortals(app: Pick<CatalogApp, "slug">) {
  return !temporarilyHiddenPortalSlugs.has(app.slug);
}

export type CatalogApp = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  iconUrl: string | null;
  url: string;
  destinationUrl: string;
  status: AppStatus;
  effectiveStatus: AppStatus;
  order: number;
  integrationKey: string | null;
  publicEnabled: boolean;
  publicPublishAt: string | null;
  publicVisible: boolean;
  studentEnabled: boolean;
  studentPublishAt: string | null;
  studentVisible: boolean;
  archivedAt: string | null;
};

const ministryAppUrls: Record<string, string> = {
  generopoly: "/apps/generopoly",
  "profil-mapp": "/apps/profil-mapp",
  "ma-ligne-de-vie": "/etudiant/ligne-de-vie",
};

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
  public_enabled: boolean;
  public_publish_at: string | null;
  student_enabled: boolean;
  student_publish_at: string | null;
  archived_at: string | null;
};

const isDue = (enabled: boolean, date: string | null, now: number) => enabled && (!date || new Date(date).getTime() <= now);

function mapRow(row: CatalogRow, now: number): CatalogApp {
  const publicVisible = isDue(row.public_enabled, row.public_publish_at, now);
  const studentVisible = isDue(row.student_enabled, row.student_publish_at, now);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.short_description,
    category: row.category,
    iconUrl: row.icon_url,
    url: ministryAppUrls[row.slug] ?? row.destination_url,
    destinationUrl: row.destination_url,
    status: row.status,
    effectiveStatus: row.status === "scheduled" && (publicVisible || studentVisible) ? "published" : row.status,
    order: row.display_order,
    integrationKey: row.integration_key,
    publicEnabled: row.public_enabled,
    publicPublishAt: row.public_publish_at,
    publicVisible,
    studentEnabled: row.student_enabled,
    studentPublishAt: row.student_publish_at,
    studentVisible,
    archivedAt: row.archived_at,
  };
}

export async function getCatalogApps({
  includeUnpublished = false,
  includeArchived = false,
  channel = includeUnpublished ? "admin" : "public",
}: {
  includeUnpublished?: boolean;
  includeArchived?: boolean;
  channel?: CatalogChannel;
} = {}): Promise<CatalogApp[]> {
  const supabase = await createClient();
  const now = new Date();
  const nowIso = now.toISOString();
  let query = supabase.from("app_catalog").select("id,slug,name,short_description,category,icon_url,destination_url,status,display_order,integration_key,public_enabled,public_publish_at,student_enabled,student_publish_at,archived_at");
  if (!includeArchived) query = query.is("archived_at", null);
  if (channel === "public") {
    query = query.in("status", ["scheduled", "published"]).eq("public_enabled", true).or(`public_publish_at.is.null,public_publish_at.lte.${nowIso}`);
  } else if (channel === "student") {
    query = query.in("status", ["scheduled", "published"]).eq("student_enabled", true).or(`student_publish_at.is.null,student_publish_at.lte.${nowIso}`);
  } else if (!includeUnpublished) {
    query = query.eq("status", "published");
  }
  const { data, error } = await query.order("display_order", { ascending: true }).order("name", { ascending: true });
  if (error) {
    if (channel !== "admin") return [];
    throw new Error(`Chargement du catalogue impossible : ${error.message}`);
  }
  return (data as CatalogRow[]).map((row) => mapRow(row, now.getTime()));
}

async function loadStudentToolsEnabled() {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("app_studio_settings").select("student_tools_enabled").eq("singleton", true).maybeSingle();
  if (error) return false;
  return Boolean(data?.student_tools_enabled);
}

const getCachedStudentToolsEnabled = unstable_cache(
  loadStudentToolsEnabled,
  ["student-tools-settings-v1"],
  { tags: [STUDENT_TOOLS_SETTINGS_CACHE_TAG], revalidate: 300 },
);

async function loadStudentCatalogRows() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("app_catalog")
    .select("id,slug,name,short_description,category,icon_url,destination_url,status,display_order,integration_key,public_enabled,public_publish_at,student_enabled,student_publish_at,archived_at")
    .is("archived_at", null)
    .in("status", ["scheduled", "published"])
    .eq("student_enabled", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) return [] as CatalogRow[];
  return data as CatalogRow[];
}

const getCachedStudentCatalogRows = unstable_cache(
  loadStudentCatalogRows,
  ["student-tools-catalog-v1"],
  { tags: [STUDENT_TOOLS_SETTINGS_CACHE_TAG], revalidate: 300 },
);

export async function getStudentToolsEnabled() {
  // En production, ce réglage global est identique pour les 400 participants :
  // une lecture partagée remplace donc 400 requêtes PostgREST simultanées.
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return getCachedStudentToolsEnabled();
  }

  // Développement local sans service_role : conserver le comportement RLS.
  const supabase = await createClient();
  const { data, error } = await supabase.from("app_studio_settings").select("student_tools_enabled").eq("singleton", true).maybeSingle();
  if (error) return false;
  return Boolean(data?.student_tools_enabled);
}

export async function getStudentTools() {
  if (!(await getStudentToolsEnabled())) return [];
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const now = Date.now();
    return (await getCachedStudentCatalogRows())
      .map((row) => mapRow(row, now))
      .filter((app) => app.studentVisible && isToolVisibleInPortals(app));
  }
  return (await getCatalogApps({ channel: "student" })).filter(isToolVisibleInPortals);
}

/** Portail public unique « Mes outils », alimenté par les fiches existantes. */
export async function getPublicToolsPortal() {
  const now = Date.now();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("app_catalog")
    .select("id,slug,name,short_description,category,icon_url,destination_url,status,display_order,integration_key,public_enabled,public_publish_at,student_enabled,student_publish_at,archived_at")
    .is("archived_at", null)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) return [];
  return (data as CatalogRow[])
    .map((row) => mapRow(row, now))
    .filter((app) => (app.publicVisible || app.slug === "profil-mapp") && isToolVisibleInPortals(app));
}

export async function getCatalogAppBySlug(slug: string) {
  const apps = await getCatalogApps({ includeUnpublished: true, includeArchived: true, channel: "admin" });
  return apps.find((app) => app.slug === slug) ?? null;
}
