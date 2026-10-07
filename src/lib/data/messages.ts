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
