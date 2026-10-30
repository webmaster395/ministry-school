import { SupabaseClient } from "@supabase/supabase-js";

export type Message = {
  id: string;
  title: string;
  body: string;
  by: string | null;
  at: string;
  isNew: boolean;
  system: boolean;
  targetUrl: string | null;
  targetType: string | null;
  targetId: string | null;
  ctaLabel: string | null;
};

export type DigestItem = {
  id: string;
  category: string;
  title: string;
  body: string | null;
  targetUrl: string | null;
  targetType: string | null;
  courseId: string | null;
  courseTitle: string;
  typeLabel: string;
};

export type DigestDetails = {
  date: string | null;
  frequency: "daily" | "weekly" | null;
  periodKey: string | null;
  title: string;
  intro: string;
  items: DigestItem[];
};

/**
 * Les communications humaines passent par l'écran Communication et ont toujours `sent_as`.
 * Les annonces créées automatiquement par la plateforme n'en ont pas : leur auteur réel reste
 * dans author_id pour l'audit, mais n'est jamais exposé comme expéditeur à l'étudiant.
 */
function studentFacingSender(message: { is_welcome: boolean; is_system: boolean; sent_as: string | null; author: { full_name: string } | null }) {
  const system = message.is_system || message.is_welcome || !message.sent_as;
  return { by: system ? null : (message.author?.full_name ?? null), system };
}

/**
 * Les messages envoyés par les enseignants et l'équipe (annonces). Seulement des messages :
 * les consignes sont dans « Travail à faire », les documents dans la fiche de chaque séance.
 * « Nouveau » = reçu depuis la dernière fois que la personne a tout marqué comme lu.
 */
export async function getStudentMessages(
  supabase: SupabaseClient,
  since: string,
  options?: { arrival?: string | null; limit?: number },
): Promise<Message[]> {
  // Le message de bienvenue arrive « à l'instant » de l'inscription de chacun : on affiche sa date d'arrivée
  const arrival = options?.arrival ?? null;

  const { data } = await supabase
    .from("announcements")
    .select("id, title, body, created_at, is_welcome, is_system, sent_as, target_url, target_type, target_id, cta_label, author:profiles!announcements_author_id_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 50);

  return (
    (data ?? []) as unknown as {
      id: string;
      title: string;
      body: string;
      created_at: string;
      is_welcome: boolean;
      is_system: boolean;
      sent_as: string | null;
      author: { full_name: string } | null;
      target_url: string | null;
      target_type: string | null;
      target_id: string | null;
      cta_label: string | null;
    }[]
  )
    .map((m) => {
      const at = m.is_welcome && arrival ? arrival : m.created_at;
      // Le message de bienvenue est daté de la création du compte, qui est aussi l'instant « dernier message vu » d'un nouveau compte : égalité = pas encore lu
      const isNew = m.is_welcome ? at >= since : at > since;
      const sender = studentFacingSender(m);
      const targetUrl = m.target_url?.startsWith("/") ? m.target_url : null;
      return {
        id: m.id,
        title: m.title,
        body: m.body,
        ...sender,
        at,
        isNew,
        targetUrl,
        targetType: m.target_type,
        targetId: m.target_id,
        ctaLabel: targetUrl ? m.cta_label : null,
      };
    })
    .sort((a, b) => (a.at < b.at ? 1 : -1));
}

/** Détails privés d'un récapitulatif appartenant à la personne connectée. */
export async function getDailyDigestDetails(
  supabase: SupabaseClient,
  announcementId: string,
): Promise<DigestDetails | null> {
  const { data, error } = await supabase.rpc("daily_notification_digest_details", {
    p_announcement: announcementId,
  });
  if (error || !data || typeof data !== "object") return null;
  const value = data as { date?: unknown; frequency?: unknown; periodKey?: unknown; title?: unknown; intro?: unknown; items?: unknown };
  const items = Array.isArray(value.items)
    ? value.items
        .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
        .map((item) => ({
          id: String(item.id ?? ""),
          category: String(item.category ?? "workflow"),
          title: String(item.title ?? "Information Ministry School"),
          body: typeof item.body === "string" ? item.body : null,
          targetUrl:
            typeof item.targetUrl === "string" && item.targetUrl.startsWith("/")
              ? item.targetUrl
              : null,
          targetType: typeof item.targetType === "string" ? item.targetType : null,
          courseId: typeof item.courseId === "string" ? item.courseId : null,
          courseTitle:
            typeof item.courseTitle === "string" && item.courseTitle.trim()
              ? item.courseTitle
              : "Ministry School",
          typeLabel:
            typeof item.typeLabel === "string" ? item.typeLabel : "Contenu",
        }))
    : [];
  return {
    date: typeof value.date === "string" ? value.date : null,
    frequency: value.frequency === "daily" || value.frequency === "weekly" ? value.frequency : null,
    periodKey: typeof value.periodKey === "string" ? value.periodKey : null,
    title: typeof value.title === "string" ? value.title : "Tes nouveautés de la semaine",
    intro: typeof value.intro === "string" ? value.intro : "De nouveaux contenus sont disponibles dans tes cours.",
    items,
  };
}

/** Résumé compact pour la boîte de réception, sans couper au milieu d'une liste. */
export function messagePreview(body: string, maxLength = 180) {
  const normalized = body.replace(/^[•-]\s*/gm, "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  const shortened = normalized.slice(0, maxLength + 1);
  const boundary = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, boundary > maxLength * 0.65 ? boundary : maxLength).trim()}…`;
}

/** « Aujourd'hui », « Hier » ou la date courte. */
export function shortDate(value: string) {
  const d = new Date(value);
  const today = new Date();
  const days = Math.floor(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86400000
  );
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(d);
}
