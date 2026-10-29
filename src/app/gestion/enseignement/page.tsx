import { TYPE_COLUMN } from "@/lib/material-types";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";
import { buildRows, getMinistrySessions } from "@/lib/data/pilotage";
import { getMinistry, INK } from "@/lib/ministry";
import PrepBoard, { type PrepTab } from "@/components/PrepBoard";
import { teacherPanels } from "@/components/gestion/TeacherPanels";

export default async function TeachingPage({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string; filtre?: string }>;
}) {
  const { onglet, filtre } = await searchParams;
  const filter = filtre === "a-completer" || filtre === "prets" ? filtre : "tous";
  const tab: PrepTab = onglet === "avenir" || onglet === "passes" ? onglet : "prochain";

  const viewer = await getViewer();
  if (!viewer || !viewer.roles.steeringMinistryIds.length) redirect("/etudiant");

  const supabase = await createClient();
  const sessions = (await Promise.all(
    viewer.roles.steeringMinistryIds.map((id) => getMinistrySessions(supabase, id)),
  )).flat();
  const rows = await buildRows(supabase, sessions, "pilotage");

  const today = new Date().toISOString().slice(0, 10);
  const next = rows.find((r) => r.s.session_date >= today);
  let panels;
  if (tab === "prochain" && next) {
    const [{ data: materials }, { data: assignments }] = await Promise.all([
      supabase.from("materials").select("id, title, link_url, file_url, visible_at" + TYPE_COLUMN).eq("session_id", next.s.id).order("created_at"),
      supabase.from("assignments").select("id, title, description, instructions, content_type, resource_url, file_url, phase, sort_order, kind, duration_min, due_at, visible_at").eq("session_id", next.s.id).order("created_at"),
    ]);
    panels = teacherPanels(next.s, assignments ?? [], materials ?? []);
  }

  return (
    <PrepBoard
      panels={panels}
      tab={tab}
      labels={{ avenir: "Cours à venir", passes: "Cours passés" }}
      upcomingFilter={{
        current: filter,
        hrefFor: (f) => (f === "tous" ? "/gestion/enseignement?onglet=avenir" : `/gestion/enseignement?onglet=avenir&filtre=${f}`),
      }}
      hrefFor={(t) => (t === "prochain" ? "/gestion/enseignement" : `/gestion/enseignement?onglet=${t}`)}
      rows={rows}
      ministryColor={getMinistry(viewer.ministrySlug)?.color ?? INK}
      today={today}
    />
  );
}
