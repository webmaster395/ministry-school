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
  displayTitle: string;
  longDescription: string;
  tags: string[];
  resultUrl: string | null;
  toolType: "test" | "interactive" | "simulator" | "external";
  storyTitle: string; storyImageUrl: string | null; storyDestinationUrl: string; storyOrder: number;
  postTitle: string; postImageUrl: string | null; postDestinationUrl: string; postOrder: number;
  resourceTitle: string; resourceDescription: string; resourceImageUrl: string | null; resourceCategory: string; resourceTags: string[]; resourceDestinationUrl: string; resourceOrder: number;
  placementStory: boolean; placementPost: boolean; placementResources: boolean; placementWork: boolean; placementMinistry: boolean;
  trackingMode: "result" | "explicit" | "none";
  accessScope: "super_admin" | "students" | "selected";
  allowedUserIds: string[]; allowedMinistryIds: string[]; publicAccess: boolean;
  featured: boolean; featuredStartAt: string | null; featuredEndAt: string | null; featuredGeneration: number;
};

const ministryAppUrls: Record<string, string> = {
  generopoly: "/apps/generopoly",
  "profil-mapp": "/apps/profil-mapp",
  "je-suis-par-la-grace-de-dieu": "/etudiant/identite",
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
  display_title: string | null; long_description: string | null; tags: string[] | null; result_url: string | null;
  tool_type: CatalogApp["toolType"];
  story_title: string | null; story_image_url: string | null; story_destination_url: string | null; story_order: number;
  post_title: string | null; post_image_url: string | null; post_destination_url: string | null; post_order: number;
  resource_title: string | null; resource_description: string | null; resource_image_url: string | null; resource_category: string | null; resource_tags: string[] | null; resource_destination_url: string | null; resource_order: number;
  placement_story: boolean; placement_post: boolean; placement_resources: boolean; placement_work: boolean; placement_ministry: boolean;
  tracking_mode: CatalogApp["trackingMode"]; access_scope: CatalogApp["accessScope"];
  allowed_user_ids: string[] | null; allowed_ministry_ids: string[] | null; public_access: boolean;
  featured: boolean; featured_start_at: string | null; featured_end_at: string | null; featured_generation: number;
};

const catalogSelect = "id,slug,name,short_description,category,icon_url,destination_url,status,display_order,integration_key,public_enabled,public_publish_at,student_enabled,student_publish_at,archived_at,display_title,long_description,tags,result_url,tool_type,story_title,story_image_url,story_destination_url,story_order,post_title,post_image_url,post_destination_url,post_order,resource_title,resource_description,resource_image_url,resource_category,resource_tags,resource_destination_url,resource_order,placement_story,placement_post,placement_resources,placement_work,placement_ministry,tracking_mode,access_scope,allowed_user_ids,allowed_ministry_ids,public_access,featured,featured_start_at,featured_end_at,featured_generation";

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
    displayTitle: row.display_title || row.name,
    longDescription: row.long_description || "",
    tags: row.tags || [], resultUrl: row.result_url, toolType: row.tool_type || "interactive",
    storyTitle: row.story_title || row.name, storyImageUrl: row.story_image_url || row.icon_url, storyDestinationUrl: row.story_destination_url || row.destination_url, storyOrder: row.story_order || 0,
    postTitle: row.post_title || row.name, postImageUrl: row.post_image_url || row.icon_url, postDestinationUrl: row.post_destination_url || row.destination_url, postOrder: row.post_order || 0,
    resourceTitle: row.resource_title || row.name, resourceDescription: row.resource_description || row.short_description, resourceImageUrl: row.resource_image_url || row.icon_url, resourceCategory: row.resource_category || row.category, resourceTags: row.resource_tags || [], resourceDestinationUrl: row.resource_destination_url || row.destination_url, resourceOrder: row.resource_order || 0,
    placementStory: row.placement_story, placementPost: row.placement_post, placementResources: row.placement_resources, placementWork: row.placement_work, placementMinistry: row.placement_ministry,
    trackingMode: row.tracking_mode || "none", accessScope: row.access_scope || "students", allowedUserIds: row.allowed_user_ids || [], allowedMinistryIds: row.allowed_ministry_ids || [], publicAccess: row.public_access,
    featured: row.featured, featuredStartAt: row.featured_start_at, featuredEndAt: row.featured_end_at, featuredGeneration: row.featured_generation || 1,
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
  let query = supabase.from("app_catalog").select(catalogSelect);
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
  // Lecture avec la session réelle : la RLS applique les groupes sélectionnés
  // et empêche l'accès direct à un outil privé.
  return (await getCatalogApps({ channel: "student" })).filter(isToolVisibleInPortals);
}

/** Portail public unique « Mes outils », alimenté par les fiches existantes. */
export async function getPublicToolsPortal() {
  const now = Date.now();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("app_catalog")
    .select(catalogSelect)
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
