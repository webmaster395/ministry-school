import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { courseNotesEnabled } from "@/lib/features/course-notes";
import NotesLibrary, {
  type NoteLibraryItem,
} from "@/components/course/NotesLibrary";

export default async function NotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await courseNotesEnabled(supabase, user.id))) notFound();

  const { data: rows } = await supabase
    .from("course_notes")
    .select(
      "id, session_id, content_html, plain_text, updated_at, session:sessions(session_date, track, description, courses(title))",
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  const sessionIds = (rows ?? []).map((row) => row.session_id);
  const { data: trainerLinks } = sessionIds.length
    ? await supabase
        .from("session_trainers")
        .select("session_id, trainer:trainers(first_name, last_name)")
        .in("session_id", sessionIds)
        .order("position")
    : { data: [] };
  const trainersBySession = new Map<string, string[]>();
  for (const link of trainerLinks ?? []) {
    const trainer = link.trainer as unknown as {
      first_name: string;
      last_name: string;
    } | null;
    if (!trainer) continue;
    trainersBySession.set(link.session_id, [
      ...(trainersBySession.get(link.session_id) ?? []),
      `${trainer.first_name} ${trainer.last_name}`.trim(),
    ]);
  }
  const notes: NoteLibraryItem[] = (rows ?? []).flatMap((row) => {
    const session = row.session as unknown as {
      session_date: string;
      track: string | null;
      description: string | null;
      courses: { title: string } | null;
    } | null;
    if (!session) return [];
    return [
      {
        id: row.id,
        sessionId: row.session_id,
        course: session.courses?.title ?? session.description ?? "Cours",
        date: session.session_date,
        dateLabel: new Intl.DateTimeFormat("fr-FR", {
          dateStyle: "long",
        }).format(new Date(`${session.session_date}T00:00:00`)),
        trainers: trainersBySession.get(row.session_id) ?? [],
        category: session.track ?? "Cours",
        html: row.content_html,
        text: row.plain_text,
        updatedLabel: new Intl.DateTimeFormat("fr-FR", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(row.updated_at)),
      },
    ];
  });

  return (
    <div className="space-y-6">
      <header className="max-w-3xl">
        <p className="label text-xs tracking-[0.16em] text-muted">
          Espace personnel
        </p>
        <h1 className="font-title mt-2 text-3xl text-foreground sm:text-4xl">
          Mes notes
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Retrouve toutes tes notes personnelles, classées par cours et par
          date.
        </p>
      </header>
      <NotesLibrary notes={notes} />
    </div>
  );
}
