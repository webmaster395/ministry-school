import { createClient } from "@/lib/supabase/server";

type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  author: { full_name: string } | null;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function StudentMessagesPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("announcements")
    .select("id, title, body, created_at, author:profiles!announcements_author_id_fkey(full_name)")
    .order("created_at", { ascending: false });

  const announcements = (data ?? []) as unknown as Announcement[];

  return (
    <section className="rounded-lg border border-border bg-background p-6">
      <h2 className="mb-1 label text-xs tracking-[0.18em] text-muted">MESSAGES</h2>
      <p className="mb-6 text-sm text-muted">
        Les annonces de vos enseignants et de l&apos;équipe pédagogique.
      </p>

      {announcements.length ? (
        <ul className="space-y-4">
          {announcements.map((a) => (
            <li key={a.id} className="rounded-md border border-border p-4">
              <p className="font-medium text-foreground">{a.title}</p>
              <p className="mt-0.5 text-xs text-muted">
                {a.author?.full_name ? `${a.author.full_name} · ` : ""}
                {formatDateTime(a.created_at)}
              </p>
              <p className="mt-2 whitespace-pre-line text-sm text-foreground">{a.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Aucun message pour le moment.</p>
      )}
    </section>
  );
}
