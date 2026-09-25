import { SupabaseClient } from "@supabase/supabase-js";

export type Message = {
  id: string;
  title: string;
  body: string;
  by: string | null;
  at: string;
  isNew: boolean;
};

/**
 * Les messages envoyés par les enseignants et l'équipe (annonces). Seulement des messages :
 * les consignes sont dans « Travail à faire », les documents dans la fiche de chaque séance.
 * « Nouveau » = reçu depuis la dernière fois que la personne a tout marqué comme lu.
 */
export async function getStudentMessages(supabase: SupabaseClient, since: string): Promise<Message[]> {
  // Le message de bienvenue arrive « à l'instant » de l'inscription de chacun : on affiche sa date d'arrivée
  const { data: auth } = await supabase.auth.getUser();
  const { data: me } = auth.user
    ? await supabase.from("profiles").select("created_at").eq("id", auth.user.id).single()
    : { data: null };
  const arrival = (me?.created_at as string | undefined) ?? null;

  const { data } = await supabase
    .from("announcements")
    .select("id, title, body, created_at, is_welcome, author:profiles!announcements_author_id_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    (data ?? []) as unknown as {
      id: string;
      title: string;
      body: string;
      created_at: string;
      is_welcome: boolean;
      author: { full_name: string } | null;
    }[]
  )
    .map((m) => {
      const at = m.is_welcome && arrival ? arrival : m.created_at;
      return { id: m.id, title: m.title, body: m.body, by: m.is_welcome ? null : (m.author?.full_name ?? null), at, isNew: at > since };
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
