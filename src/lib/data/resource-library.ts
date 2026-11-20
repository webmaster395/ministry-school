import type { SupabaseClient } from "@supabase/supabase-js";
import { getStudentAllSessions, getStudentMaterials } from "@/lib/data/student";

export type LibraryResourceKind = "pdf" | "video" | "link" | "tool";
export type LibraryResourceSource = "course" | "opportunity" | "library";

export type LibraryResource = {
  id: string;
  title: string;
  description: string | null;
  kind: LibraryResourceKind;
  source: LibraryResourceSource;
  sourceLabel: string;
  sourceTitle: string;
  href: string;
  availableAt: string | null;
};

function isVideo(value: string | null | undefined) {
  return Boolean(value && /(youtube\.com|youtu\.be|vimeo\.com|\bvid[ée]o\b)/i.test(value));
}

function materialKind(resourceType: string | null | undefined, link: string | null, file: string | null): LibraryResourceKind {
  if (isVideo(resourceType) || isVideo(link)) return "video";
  if (file || /pdf|présentation|document|lecture|livre/i.test(resourceType ?? "")) return "pdf";
  if (/outil|ressource/i.test(resourceType ?? "")) return "tool";
  return "link";
}

function opportunityKind(resource: { kind: string; mime_type: string | null; external_url: string | null; file_name: string | null }): LibraryResourceKind {
  if (isVideo(resource.external_url) || /video/i.test(resource.mime_type ?? "")) return "video";
  if (resource.kind === "link") return "link";
  if (resource.kind === "resource") return "tool";
  if (/pdf/i.test(resource.mime_type ?? "") || /\.pdf$/i.test(resource.file_name ?? "")) return "pdf";
  return "pdf";
}

/**
 * Bibliothèque transversale de l'étudiant. Les requêtes utilisent volontairement
 * les politiques RLS existantes : une ressource non encore disponible n'entre
 * jamais dans le résultat envoyé au navigateur.
 */
export async function getStudentResourceLibrary(supabase: SupabaseClient, userId: string): Promise<LibraryResource[]> {
  const sessions = await getStudentAllSessions(supabase, userId);
  const sessionIds = sessions.map((session) => session.id);
  const [materials, videosResult, opportunityResourcesResult, managedResult] = await Promise.all([
    getStudentMaterials(supabase, sessionIds),
    sessionIds.length
      ? supabase.from("session_videos").select("session_id,url,visible_at").in("session_id", sessionIds).lte("visible_at", new Date().toISOString())
      : Promise.resolve({ data: [] }),
    supabase.from("opportunity_resources").select("id,opportunity_id,title,description,kind,external_url,file_path,file_name,mime_type,created_at").order("created_at", { ascending: false }),
    supabase.from("managed_resources").select("id,title,description,kind,category,updated_at").contains("placements", ["resources"]).eq("status", "published").order("updated_at", { ascending: false }),
  ]);

  const sessionsById = new Map(sessions.map((session) => [session.id, session]));
  const opportunityResources = opportunityResourcesResult.data ?? [];
  const opportunityIds = [...new Set(opportunityResources.map((resource) => resource.opportunity_id))];
  const { data: opportunities } = opportunityIds.length
    ? await supabase.from("opportunities").select("id,title,is_project,is_training").in("id", opportunityIds)
    : { data: [] };
  const opportunitiesById = new Map((opportunities ?? []).map((opportunity) => [opportunity.id, opportunity]));

  const courseMaterials: LibraryResource[] = materials.flatMap((material) => {
    const enriched = material as typeof material & { description?: string | null; resource_type?: string | null };
    const session = sessionsById.get(material.session_id);
    if (!session || (!material.link_url && !material.file_url)) return [];
    return [{
      id: `material:${material.id}`,
      title: material.title,
      description: enriched.description ?? null,
      kind: materialKind(enriched.resource_type, material.link_url, material.file_url),
      source: "course",
      sourceLabel: "Cours",
      sourceTitle: session.courses?.title ?? session.description ?? "Cours Ministry School",
      href: `/etudiant/ressources/${material.id}/ouvrir`,
      availableAt: material.visible_at ?? null,
    }];
  });

  const courseVideos: LibraryResource[] = (videosResult.data ?? []).flatMap((video) => {
    const session = sessionsById.get(video.session_id);
    if (!session?.id || !video.url) return [];
    return [{
      id: `video:${video.session_id}`,
      title: `Replay — ${session.courses?.title ?? session.description ?? "Cours Ministry School"}`,
      description: "Vidéo du cours",
      kind: "video",
      source: "course",
      sourceLabel: "Cours",
      sourceTitle: session.courses?.title ?? session.description ?? "Cours Ministry School",
      href: video.url,
      availableAt: video.visible_at ?? null,
    }];
  });

  const opportunityItems: LibraryResource[] = opportunityResources.flatMap((resource) => {
    const opportunity = opportunitiesById.get(resource.opportunity_id);
    if (!opportunity) return [];
    const sourceLabel = opportunity.is_project && opportunity.is_training
      ? "Projet et formation"
      : opportunity.is_training ? "Formation" : "Projet";
    return [{
      id: `opportunity:${resource.id}`,
      title: resource.title,
      description: resource.description,
      kind: opportunityKind(resource),
      source: "opportunity",
      sourceLabel,
      sourceTitle: opportunity.title,
      href: `/etudiant/services/${resource.opportunity_id}/ressources/${resource.id}/ouvrir`,
      availableAt: resource.created_at,
    }];
  });

  const managedItems: LibraryResource[] = (managedResult.data ?? []).map((resource) => ({
    id: `managed:${resource.id}`,
    title: resource.title,
    description: resource.description,
    kind: resource.kind === "video" || resource.kind === "audio" ? "video" : resource.kind === "link" ? "link" : resource.kind === "tool" ? "tool" : "pdf",
    source: "library",
    sourceLabel: resource.category || "Bibliothèque",
    sourceTitle: "Ministry School",
    href: `/etudiant/ressources/gerees/${resource.id}/ouvrir`,
    availableAt: resource.updated_at,
  }));

  return [...managedItems, ...courseMaterials, ...courseVideos, ...opportunityItems]
    .sort((left, right) => (right.availableAt ?? "").localeCompare(left.availableAt ?? ""));
}
