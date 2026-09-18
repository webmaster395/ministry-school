import { createClient } from "@/lib/supabase/server";
import { sendAnnouncement, deleteAnnouncement } from "./actions";

type Announcement = {
  id: string;
  title: string;
  body: string;
  day: string | null;
  created_at: string;
  author_id: string;
  ministries: { name: string } | null;
  author: { full_name: string } | null;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function TeacherMessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: ministries }, { data: profile }, { data: sent }] = await Promise.all([
    supabase.from("ministries").select("id, name").order("name"),
    supabase.from("profiles").select("ministry_id").eq("id", user!.id).single(),
    supabase
      .from("announcements")
      .select("id, title, body, day, created_at, author_id, ministries(name), author:profiles!announcements_author_id_fkey(full_name)")
      .order("created_at", { ascending: false }),
  ]);

  const announcements = (sent ?? []) as unknown as Announcement[];

  return (
    <>
      <section className="rounded-lg border border-border bg-background p-6">
        <h2 className="mb-1 label text-xs tracking-[0.18em] text-muted">
          ENVOYER UN MESSAGE
        </h2>
        <p className="mb-4 text-sm text-muted">
          Le message apparaît directement dans l&apos;espace des étudiants concernés — aucun
          e-mail n&apos;est envoyé.
        </p>

        <form action={sendAnnouncement} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted">Destinataires — ministère</label>
            <select
              name="ministry_id"
              defaultValue={profile?.ministry_id ?? ""}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            >
              <option value="">Tous les ministères</option>
              {(ministries ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Jour</label>
            <select
              name="day"
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            >
              <option value="">Les deux jours</option>
              <option value="samedi">Samedi uniquement</option>
              <option value="dimanche">Dimanche uniquement</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted">Objet</label>
            <input
              type="text"
              name="title"
              required
              placeholder="Changement de salle pour samedi"
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted">Message</label>
            <textarea
              name="body"
              required
              rows={4}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            className="rounded-md label bg-accent px-4 py-2.5 text-xs tracking-[0.12em] text-on-accent transition hover:bg-[#1b2221] sm:col-span-2 sm:w-fit"
          >
            Envoyer le message
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-background p-6">
        <h2 className="mb-4 label text-xs tracking-[0.18em] text-muted">MESSAGES ENVOYÉS</h2>
        {announcements.length ? (
          <ul className="space-y-4">
            {announcements.map((a) => (
              <li key={a.id} className="rounded-md border border-border p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-foreground">{a.title}</p>
                  <span className="flex items-center gap-3 text-xs text-muted">
                    {formatDateTime(a.created_at)}
                    {a.author_id === user!.id && (
                      <form action={deleteAnnouncement}>
                        <input type="hidden" name="announcement_id" value={a.id} />
                        <button
                          type="submit"
                          className="text-link transition hover:underline"
                        >
                          Supprimer
                        </button>
                      </form>
                    )}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {a.ministries?.name ?? "Tous les ministères"}
                  {a.day ? ` · ${a.day}` : ""}
                  {a.author?.full_name ? ` · ${a.author.full_name}` : ""}
                </p>
                <p className="mt-2 whitespace-pre-line text-sm text-foreground">{a.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Aucun message envoyé pour le moment.</p>
        )}
      </section>
    </>
  );
}
