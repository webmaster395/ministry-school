import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { courseNotesEnabled } from "@/lib/features/course-notes";
import CourseNotesEditor from "@/components/course/CourseNotesEditor";

function formatTime(value: string) {
  return value.slice(0, 5).replace(":", "h").replace(/h00$/, "h");
}

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await courseNotesEnabled(supabase, user.id))) notFound();

  const { data: note } = await supabase
    .from("course_notes")
    .select(
      "content_html, session:sessions(session_date, start_time, end_time, track, description, courses(title))",
    )
    .eq("user_id", user.id)
    .eq("session_id", sessionId)
    .maybeSingle();
  if (!note) notFound();
  const session = note.session as unknown as {
    session_date: string;
    start_time: string;
    end_time: string;
    track: string | null;
    description: string | null;
    courses: { title: string } | null;
  } | null;
  if (!session) notFound();
  const title =
    session.courses?.title ?? session.description ?? "Notes du cours";
  const date = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${session.session_date}T00:00:00`));
  const hours = `${formatTime(session.start_time)}–${formatTime(session.end_time)}`;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/etudiant/notes"
        className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-foreground hover:underline"
      >
        <ArrowLeft size={16} /> Retour vers Mes notes
      </Link>
      <header className="mt-6 border-b border-border pb-6">
        <p className="label text-xs tracking-[0.15em] text-muted">
          Note personnelle
        </p>
        <h1 className="font-title mt-2 text-3xl leading-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-muted">
          {session.track ?? "Cours"} · {date} · {hours}
        </p>
        <Link
          href={`/etudiant/seances/${sessionId}`}
          className="mt-3 inline-flex text-sm font-semibold text-foreground hover:underline"
        >
          Revenir au cours →
        </Link>
      </header>
      <div className="mt-7">
        <CourseNotesEditor
          sessionId={sessionId}
          initialHtml={note.content_html}
          heading="Continuer mes notes"
          showLibraryLink={false}
        />
      </div>
    </div>
  );
}
