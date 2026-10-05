import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { courseNotesEnabled } from "@/lib/features/course-notes";
import NotesLibrary, {
  type NoteLibraryItem,
} from "@/components/course/NotesLibrary";

function formatTime(value: string) {
  return value.slice(0, 5).replace(":", "h").replace(/h00$/, "h");
}

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
      "id, session_id, updated_at, session:sessions(session_date, start_time, end_time, track, description, courses(title))",
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const notes: NoteLibraryItem[] = (rows ?? [])
    .flatMap((row) => {
      const session = row.session as unknown as {
        session_date: string;
        start_time: string;
        end_time: string;
        track: string | null;
        description: string | null;
        courses: { title: string } | null;
      } | null;
      if (!session) return [];
      const date = new Date(`${session.session_date}T00:00:00`);
      return [
        {
          id: row.id,
          sessionId: row.session_id,
          title:
            session.courses?.title ?? session.description ?? "Notes du cours",
          course: session.track ?? "Cours",
          date: session.session_date,
          dateLabel: new Intl.DateTimeFormat("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(date),
          hours: `${formatTime(session.start_time)}–${formatTime(session.end_time)}`,
          monthKey: session.session_date.slice(0, 7),
          monthLabel: new Intl.DateTimeFormat("fr-FR", {
            month: "long",
            year: "numeric",
          }).format(date),
        },
      ];
    })
    .sort((left, right) => right.date.localeCompare(left.date));

  return (
    <div className="space-y-7">
      <header className="max-w-3xl">
        <p className="label text-xs tracking-[0.16em] text-muted">
          Espace personnel
        </p>
        <h1 className="font-title mt-2 text-3xl text-foreground sm:text-4xl">
          Mes notes
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Retrouve une note, puis ouvre-la pour la relire ou continuer à écrire.
        </p>
      </header>
      <NotesLibrary notes={notes} />
    </div>
  );
}
