import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";
import { getMinistries } from "@/lib/data/admin";
import { getOpportunitiesWithDates, getProgramEntries } from "@/lib/data/admin-hub";
import ProgramTab from "@/components/admin/ProgramTab";
import ManagementPageHeader from "@/components/management/ManagementPageHeader";
import MinistryPicto from "@/components/MinistryPicto";

const plain = (value: string | null) => (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function courseCategory(entry: Awaited<ReturnType<typeof getProgramEntries>>[number]) {
  if (entry.formationCategory) return entry.formationCategory;
  const track = plain(entry.track);
  if (track.includes("coeur")) return "heart";
  if (track.includes("caractere")) return "character";
  return null;
}

function uniqueCourseCount(entries: Awaited<ReturnType<typeof getProgramEntries>>) {
  return new Set(entries.map((entry) => entry.courseId ?? `${courseCategory(entry) ?? "course"}:${plain(entry.title)}`)).size;
}

type CourseInventoryRow = {
  id: string;
  formation: { category_key: "heart" | "character" | "sensitivity" | "deepening" } | null;
};

export default async function AdminCoursesAndTrainingPage({ searchParams }: { searchParams: Promise<{ parcours?: string; mois?: string }> }) {
  const [viewer, query] = await Promise.all([getViewer(), searchParams]);
  if (!viewer?.roles.superAdmin) redirect("/etudiant");
  const supabase = await createClient();
  const [opportunities, ministries, trainersResult, courseInventoryResult] = await Promise.all([
    getOpportunitiesWithDates(supabase),
    getMinistries(supabase),
    supabase.from("trainers").select("id, first_name, last_name, is_active").eq("is_active", true).order("last_name"),
    supabase.from("courses").select("id, formation:formations(category_key)"),
  ]);
  const ministryTracks = ministries.filter((item) => ["apotre", "prophete", "evangeliste", "pasteur", "docteur"].includes(item.slug));
  const allCourses = (await getProgramEntries(supabase, opportunities)).filter((entry) => entry.kind === "course");
  const selected = ["coeur", "caractere", "approfondissements", ...ministryTracks.map((item) => item.slug)].includes(query.parcours ?? "") ? query.parcours! : "coeur";
  const selectedMinistry = ministryTracks.find((item) => item.slug === selected);
  const entries = allCourses.filter((entry) => selected === "coeur"
    ? courseCategory(entry) === "heart"
    : selected === "caractere"
      ? courseCategory(entry) === "character"
      : selected === "approfondissements"
        ? courseCategory(entry) === "deepening"
        : entry.ministryId === selectedMinistry?.id);
  const selectedLabel = selected === "coeur" ? "Formation du cœur" : selected === "caractere" ? "Formation du caractère" : selected === "approfondissements" ? "Formations d’approfondissement" : `Sensibilité ${selectedMinistry?.name ?? "ministérielle"}`;
  const basePath = `/gestion/admin/cours-formations?parcours=${selected}`;
  const trainers = (trainersResult.data ?? []).map((item) => ({ id: item.id, name: `${item.first_name} ${item.last_name}`.trim() }));
  const courseInventory = (courseInventoryResult.data ?? []) as unknown as CourseInventoryRow[];
  const countCategory = (category: NonNullable<CourseInventoryRow["formation"]>["category_key"]) => {
    const explicitCourseIds = courseInventory.filter((course) => course.formation?.category_key === category).map((course) => course.id);
    const sessionCourseIds = allCourses.filter((entry) => courseCategory(entry) === category).map((entry) => entry.courseId).filter(Boolean) as string[];
    const identified = new Set([...explicitCourseIds, ...sessionCourseIds]);
    const unidentified = allCourses.filter((entry) => courseCategory(entry) === category && !entry.courseId);
    return identified.size + uniqueCourseCount(unidentified);
  };

  return <div className="space-y-6">
    <ManagementPageHeader eyebrow="SUPER ADMIN" title="Cours" subtitle="Formation du cœur, Formation du caractère, approfondissements et cours des cinq sensibilités ministérielles réunis au même endroit." mobileTitleInAppBar />
    <nav aria-label="Parcours de cours" className="grid gap-2 rounded-2xl border border-border bg-background p-2 sm:grid-cols-2 xl:grid-cols-4">
      <CourseTab href="/gestion/admin/cours-formations?parcours=coeur" active={selected === "coeur"} label="Formation du cœur" count={countCategory("heart")} />
      <CourseTab href="/gestion/admin/cours-formations?parcours=caractere" active={selected === "caractere"} label="Formation du caractère" count={countCategory("character")} />
      <CourseTab href="/gestion/admin/cours-formations?parcours=approfondissements" active={selected === "approfondissements"} label="Approfondissements" count={countCategory("deepening")} />
      {ministryTracks.map((ministry) => <CourseTab key={ministry.id} href={`/gestion/admin/cours-formations?parcours=${ministry.slug}`} active={selected === ministry.slug} label={ministry.name} count={uniqueCourseCount(allCourses.filter((entry) => entry.ministryId === ministry.id))} icon={<MinistryPicto slug={ministry.slug} size={17} />} />)}
    </nav>
    <section className="rounded-2xl border border-border bg-background p-4 sm:p-6">
      <ProgramTab entries={entries} month={query.mois} today={new Date().toISOString().slice(0, 10)} trainers={trainers} ministries={ministries.map((item) => ({ id: item.id, name: item.name }))} basePath={basePath} title={selectedLabel} subtitle="Consultez, créez et modifiez les cours de ce parcours. Chaque enregistrement ouvre un retour visuel clair." />
    </section>
  </div>;
}

function CourseTab({ href, active, label, count, icon }: { href: string; active: boolean; label: string; count: number; icon?: React.ReactNode }) {
  return <Link href={href} aria-current={active ? "page" : undefined} className={`flex min-h-12 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition ${active ? "bg-accent text-on-accent" : "text-foreground hover:bg-surface"}`}>{icon}<span className="min-w-0 flex-1 truncate">{label}</span><span className={`grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-[11px] ${active ? "bg-white/15" : "bg-surface text-muted"}`}>{count}</span></Link>;
}
