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
  const { data } = await supabase
    .from("announcements")
    .select("id, title, body, created_at, author:profiles!announcements_author_id_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    (data ?? []) as unknown as {
      id: string;
      title: string;
      body: string;
      created_at: string;
      author: { full_name: string } | null;
    }[]
  ).map((m) => ({
    id: m.id,
    title: m.title,
    body: m.body,
    by: m.author?.full_name ?? null,
    at: m.created_at,
    isNew: m.created_at > since,
  }));
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
