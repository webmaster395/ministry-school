import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";
import { buildRows, getTeacherPrepSessions } from "@/lib/data/pilotage";
import { getMinistry, INK } from "@/lib/ministry";
import PrepBoard, { type PrepTab } from "@/components/PrepBoard";

export default async function TeachingPage({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { onglet } = await searchParams;
  const tab: PrepTab = onglet === "avenir" || onglet === "passes" ? onglet : "prochain";

  const viewer = await getViewer();
  if (!viewer || (!viewer.roles.teacher && !viewer.roles.admin)) redirect("/etudiant");

  const supabase = await createClient();
  const rows = await buildRows(supabase, await getTeacherPrepSessions(supabase, viewer.roles.admin ? null : viewer.id), "enseignant");

  return (
    <PrepBoard
      tab={tab}
      hrefFor={(t) => (t === "prochain" ? "/etudiant/enseignement" : `/etudiant/enseignement?onglet=${t}`)}
      rows={rows}
      ministryColor={getMinistry(viewer.ministrySlug)?.color ?? INK}
      today={new Date().toISOString().slice(0, 10)}
    />
  );
}
