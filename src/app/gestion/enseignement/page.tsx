import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";
import { buildRows, getTeacherPrepSessions } from "@/lib/data/pilotage";
import { getMinistry, INK } from "@/lib/ministry";
import PrepBoard, { type PrepTab } from "@/components/PrepBoard";

export default async function TeachingPage({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string; filtre?: string }>;
}) {
  const { onglet, filtre } = await searchParams;
  const filter = filtre === "a-completer" || filtre === "prets" ? filtre : "tous";
  const tab: PrepTab = onglet === "avenir" || onglet === "passes" ? onglet : "prochain";

  const viewer = await getViewer();
  if (!viewer || (!viewer.roles.teacher && !viewer.roles.admin)) redirect("/etudiant");

  const supabase = await createClient();
  const rows = await buildRows(supabase, await getTeacherPrepSessions(supabase, viewer.roles.admin ? null : viewer.id), "enseignant");

  return (
    <PrepBoard
      tab={tab}
      labels={{ avenir: "Cours à venir", passes: "Cours passés" }}
      upcomingFilter={{
        current: filter,
        hrefFor: (f) => (f === "tous" ? "/gestion/enseignement?onglet=avenir" : `/gestion/enseignement?onglet=avenir&filtre=${f}`),
      }}
      hrefFor={(t) => (t === "prochain" ? "/gestion/enseignement" : `/gestion/enseignement?onglet=${t}`)}
      rows={rows}
      ministryColor={getMinistry(viewer.ministrySlug)?.color ?? INK}
      today={new Date().toISOString().slice(0, 10)}
    />
  );
}
