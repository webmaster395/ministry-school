"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendMail } from "@/lib/mail";
import { courseNotesEnabled } from "@/lib/features/course-notes";

function cleanHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(
      /<span[^>]*(?:background|background-color)[^>]*>([\s\S]*?)<\/span>/gi,
      "<mark>$1</mark>",
    )
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/<(?!\/?(?:p|br|strong|b|u|h2|h3|mark|ul|ol|li)\b)[^>]*>/gi, "")
    .replace(/<(p|strong|b|u|h2|h3|mark|ul|ol|li)\b[^>]*>/gi, "<$1>")
    .slice(0, 100_000);
}

export async function saveCourseNote(
  sessionId: string,
  contentHtml: string,
  plainText: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await courseNotesEnabled(supabase, user.id)))
    throw new Error("Accès non autorisé");
  const { error } = await supabase.from("course_notes").upsert(
    {
      user_id: user.id,
      session_id: sessionId,
      content_html: cleanHtml(contentHtml),
      plain_text: plainText.trim().slice(0, 100_000),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,session_id" },
  );
  if (error) throw new Error("La note n’a pas pu être enregistrée.");
  revalidatePath("/etudiant/notes");
  return { savedAt: new Date().toISOString() };
}

export async function emailCourseNote(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !(await courseNotesEnabled(supabase, user.id)))
    throw new Error("Accès non autorisé");
  const [{ data: note }, { data: session }] = await Promise.all([
    supabase
      .from("course_notes")
      .select("plain_text")
      .eq("user_id", user.id)
      .eq("session_id", sessionId)
      .maybeSingle(),
    supabase
      .from("sessions")
      .select("description, session_date, courses(title)")
      .eq("id", sessionId)
      .single(),
  ]);
  if (!note?.plain_text) throw new Error("Ajoute d’abord quelques notes.");
  const course =
    (session?.courses as unknown as { title?: string } | null)?.title ??
    session?.description ??
    "Cours Ministry School";
  const date = session?.session_date
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(
        new Date(`${session.session_date}T00:00:00`),
      )
    : "";
  await sendMail({
    to: user.email,
    subject: `Mes notes — ${course}`,
    text: `${course}${date ? `\n${date}` : ""}\n\n${note.plain_text}\n\n— Ministry School`,
  });
  return { sent: true };
}
