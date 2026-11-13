import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, ChevronRight, Square } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStudentTools, type CatalogApp } from "@/lib/apps/catalog";
import {
  getStudentAllSessions,
  getStudentProgramAssignments,
  getStudentCompletedIds,
  getStudentProfile,
  getStudentWorkItems,
  type StudentSession,
} from "@/lib/data/student";
import { formatSessionDate } from "@/lib/format";
import { getMinistry, INK, sessionColor } from "@/lib/ministry";
import TravailTabs from "@/components/TravailTabs";
import { toggleAssignment } from "./actions";
import { getIdentityDashboard, type IdentityResult } from "@/lib/identity/dashboard";
import { getOfficialMappIdentityResults } from "@/lib/mapp/official-results";
import { getPublishedHeroesMotorsResult } from "@/lib/identity/heroes-motors";

type Tab = "a-faire" | "termines" | "outils";

type Assignment = Awaited<ReturnType<typeof getStudentProgramAssignments>>[number];

type TrackedTool = {
  key: string;
  name: string;
  description: string;
  completed: boolean;
  href: string;
};

function latestResult(results: IdentityResult[], kind: IdentityResult["kind"]) {
  return results.find((result) => result.kind === kind);
}

function hasCatalogTool(tools: CatalogApp[], slug: string) {
  return tools.some((tool) => tool.slug === slug);
}

function buildTrackedTools(tools: CatalogApp[], results: IdentityResult[], heroesAvailable: boolean): TrackedTool[] {
  const items: TrackedTool[] = [];
  const mapp = latestResult(results, "mapp");
  const mappQuery = new URLSearchParams();
  if (mapp?.resultRevisionId) mappQuery.set("revision", mapp.resultRevisionId);
  if (mapp?.native) mappQuery.set("native", "1");
  if (mapp?.legacy) mappQuery.set("legacy", "1");
  items.push({
    key: "profil-mapp",
    name: "Profil MAPP",
    description: "Découvre ton profil et retrouve tes restitutions personnelles.",
    completed: Boolean(mapp),
    href: mapp?.attemptId
      ? `/apps/profil-mapp/test/${mapp.attemptId}/resultat${mappQuery.size ? `?${mappQuery.toString()}` : ""}`
      : "/apps/profil-mapp",
  });

  if (heroesAvailable) {
    items.push({
      key: "heroes-motors",
      name: "Test des héros",
      description: "Retrouve les valeurs et les moteurs qui t’animent.",
      completed: true,
      href: "/etudiant/identite/mes-moteurs",
    });
  }

  if (hasCatalogTool(tools, "je-suis-par-la-grace-de-dieu")) {
    ([
      ["fruit", "Fruit de l’Esprit", "Observe ce qui porte déjà du fruit et ce qui peut encore grandir.", "/etudiant/identite/fruit-de-lesprit"],
      ["gifts", "Dons spirituels", "Explore les dons qui se manifestent et ceux que tu peux développer.", "/etudiant/identite/dons-spirituels"],
      ["skills", "Compétences naturelles", "Identifie tes forces et les compétences que tu souhaites faire grandir.", "/etudiant/identite/competences-naturelles"],
    ] as const).forEach(([kind, name, description, href]) => {
      items.push({ key: kind, name, description, completed: Boolean(latestResult(results, kind)), href });
    });
  }

  if (hasCatalogTool(tools, "ma-ligne-de-vie")) {
    items.push({
      key: "life-line",
      name: "Ma ligne de vie",
      description: "Relis ton parcours et les événements qui éclairent ton appel.",
      completed: Boolean(latestResult(results, "life-line")),
      href: "/etudiant/ligne-de-vie",
    });
  }

  return items;
}

function dueLabels(after: boolean, date: string | null) {
  const primary = after
    ? "À terminer avant le prochain cours"
    : "À terminer avant le cours concerné";
  if (!date) return [primary];
  const prefix = after ? "Prochain cours" : "Cours";
  return [primary, `${prefix} : ${formatSessionDate(date).toLowerCase()}`];
}

export default async function StudentWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { onglet } = await searchParams;
  const tab: Tab = onglet === "termines" ? "termines" : onglet === "outils" ? "outils" : "a-faire";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [sessions, { ministrySlug }, doneIds] = await Promise.all([
    getStudentAllSessions(supabase, user!.id),
    getStudentProfile(supabase, user!.id),
    getStudentCompletedIds(supabase, user!.id),
  ]);
  const assignments = await getStudentProgramAssignments(
    supabase,
    sessions.map((s) => s.id),
  );

  const ministryColor = getMinistry(ministrySlug)?.color ?? INK;
  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const isDone = (a: Assignment) => doneIds.has(a.id);
  const work = getStudentWorkItems(assignments, sessions);
  const open = work.filter(({ assignment }) => !isDone(assignment));
  const finished = work.filter(({ assignment }) => isDone(assignment));
  const shown = tab === "termines" ? finished : open;

  const [tools, dashboard, officialMappResults, lifeLine, heroesMotors] = await Promise.all([
      getStudentTools(),
      getIdentityDashboard(),
      getOfficialMappIdentityResults(),
      supabase.from("life_line_journeys").select("completed_at,updated_at").eq("user_id", user!.id).maybeSingle(),
      getPublishedHeroesMotorsResult(user!.id),
  ]);
  const nativeMappResults = dashboard.identityResults
      .filter((result) => result.kind === "mapp")
      .map((result) => ({ ...result, native: true }));
  const selectedMappResults = [
      ...nativeMappResults,
      ...officialMappResults.map((result) => ({ ...result, legacy: true })),
    ]
      .filter((result, index, results) => !result.attemptId || results.findIndex((candidate) => candidate.attemptId === result.attemptId) === index)
      .sort((left, right) => new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime());
  const identityResults = dashboard.identityResults.filter((result) => result.kind !== "mapp");
  const lifeLineResults: IdentityResult[] = lifeLine.data
      ? [{ kind: "life-line", completedAt: lifeLine.data.completed_at ?? lifeLine.data.updated_at ?? new Date().toISOString() }]
      : [];
  const heroesResults: IdentityResult[] = heroesMotors
      ? [{ kind: "heroes-motors", completedAt: heroesMotors.publishedAt }]
      : [];
  const results = [...selectedMappResults, ...identityResults, ...lifeLineResults, ...heroesResults];
  const incompleteTools = buildTrackedTools(tools, results, Boolean(heroesMotors)).filter((tool) => !tool.completed);
  if (tab === "outils" && !incompleteTools.length) redirect("/etudiant/travail");

  // Chaque travail est présenté sous la séance pour laquelle il doit être prêt.
  const groups = new Map<string, typeof shown>();
  for (const item of shown) {
    const key = item.targetId ?? `sans-date:${item.origin.id}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const orderedGroups = [...groups.entries()]
    .map(([key, items]) => ({
      session: (key.startsWith("sans-date:")
        ? sessionById.get(key.replace("sans-date:", ""))
        : sessionById.get(key)) as StudentSession,
      items,
    }))
    .filter((g) => g.session)
    .sort(
      (a, b) =>
        a.session.session_date.localeCompare(b.session.session_date) ||
        a.session.start_time.localeCompare(b.session.start_time),
    );

  const tabs: { key: Tab; label: string; count?: number; href: string; distinct?: boolean }[] = [
    {
      key: "a-faire",
      label: "À faire",
      count: open.length,
      href: "/etudiant/travail",
    },
    {
      key: "termines",
      label: "Terminés",
      count: finished.length,
      href: "/etudiant/travail?onglet=termines",
    },
    ...(incompleteTools.length ? [{
      key: "outils",
      label: "Mes outils",
      href: "/etudiant/travail?onglet=outils",
      distinct: true,
    } as const] : []),
  ];

  return (
    <div className="space-y-5">
      <p className="text-[15px] text-muted">
        {tab === "outils"
          ? "Explore les outils de Ministry School et retrouve tes résultats."
          : "Retrouvez tout ce que vous devez préparer pour vos cours."}
      </p>

      <TravailTabs tabs={tabs} active={tab} />

      {tab === "outils" ? (
        <ToolsPanel tracked={incompleteTools} />
      ) : <>
      {tab === "a-faire" && open.length > 0 && (
        <section className="flex flex-wrap items-end justify-between gap-6 rounded-lg border border-border bg-background p-6">
          <div>
            <p className="text-sm text-muted">Votre préparation</p>
            <h2 className="font-title mt-1 text-[24px] leading-tight text-foreground">
              {open.length} {open.length > 1 ? "travaux" : "travail"} à faire
            </h2>
            <p className="mt-1 text-[15px] text-muted">
              Chaque consigne reste visible jusqu’à ce que vous la cochiez.
            </p>
          </div>
        </section>
      )}

      {orderedGroups.length ? (
        orderedGroups.map(({ session: s, items }) => {
          const color = sessionColor(s.track, s.session_type, ministryColor);
          const detailHref = `/etudiant/seances/${s.id}`;
          return (
            <section
              key={s.id}
              className="rounded-lg border border-border bg-background p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-soft pb-4">
                <Link
                  href={detailHref}
                  className="group flex flex-wrap items-center gap-3 transition hover:opacity-80"
                >
                  {s.track && (
                    <span
                      className="label rounded-full px-3 py-1 text-[11px] tracking-[0.1em] text-foreground"
                      style={{
                        background: `color-mix(in srgb, ${color} 28%, transparent)`,
                      }}
                    >
                      {s.track}
                    </span>
                  )}
                  <h3 className="font-title text-[20px] text-foreground group-hover:underline">
                    {s.courses?.title ?? s.description ?? "Séance"}
                  </h3>
                  <ChevronRight
                    size={18}
                    className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                  />
                </Link>

                <span className="text-sm text-muted">Pour le {formatSessionDate(s.session_date).toLowerCase()}</span>
              </div>

              <ul className="divide-y divide-border-soft">
                {items.map(({ assignment: a, targetDate, after }) => {
                  const done = isDone(a);
                  const meta = [
                    a.kind,
                    a.duration_min ? `${a.duration_min} min` : null,
                    ...dueLabels(after, targetDate),
                  ].filter(Boolean);
                  return (
                    <li key={a.id}>
                      <form
                        action={toggleAssignment}
                        className="flex items-center gap-4 py-4"
                      >
                        <input
                          type="hidden"
                          name="assignment_id"
                          value={a.id}
                        />
                        <input
                          type="hidden"
                          name="done"
                          value={done ? "1" : "0"}
                        />
                        <button
                          type="submit"
                          aria-label={
                            done
                              ? "Marquer comme à faire"
                              : "Marquer comme fait"
                          }
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
                            done
                              ? "border-foreground bg-accent text-on-accent"
                              : "border-border hover:border-foreground"
                          }`}
                        >
                          {done && <Check size={15} strokeWidth={2.4} />}
                        </button>
                        <div className="min-w-0">
                          <Link
                            href={`${detailHref}#${after ? "after-course" : "before-course"}`}
                            className={`text-[16px] font-semibold hover:underline ${
                              done
                                ? "text-muted line-through"
                                : "text-foreground"
                            }`}
                          >
                          {a.title || a.instructions}
                          </Link>
                          <p className="mt-0.5 text-sm text-muted">
                            {after
                              ? `Donné après ${s.courses?.title ?? s.description ?? "le cours précédent"}`
                              : (s.courses?.title ?? s.description ?? "Cours")}
                            {s.track ? ` · ${s.track}` : ""}
                          </p>
                          {meta.length > 0 && (
                            <p className="mt-0.5 text-sm text-muted">
                              {meta.join(" · ")}
                            </p>
                          )}
                        </div>
                        <span
                          className={`ml-auto shrink-0 rounded-full px-3 py-1 text-xs font-medium ${done ? "bg-emerald-50 text-emerald-800" : "bg-surface text-foreground"}`}
                        >
                          {done ? "Terminé" : "À faire"}
                        </span>
                      </form>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      ) : (
        <section className="rounded-lg border border-border bg-background p-6">
          <p className="text-[15px] text-muted">
            {tab === "termines"
              ? "Aucun travail terminé pour le moment."
              : "Tout est prêt : aucun travail à faire pour le moment."}
          </p>
        </section>
      )}
      </>}
    </div>
  );
}

function ToolsPanel({ tracked }: { tracked: TrackedTool[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="border-b border-border-soft px-5 py-5 sm:px-6">
        <p className="label text-[11px] tracking-[0.14em] text-muted">ESPACE PERSONNEL</p>
        <h2 className="font-title mt-1 text-[24px] leading-tight text-foreground">Outils disponibles</h2>
        <p className="mt-1 text-[15px] text-muted">Uniquement les tests qu’il te reste à réaliser.</p>
      </div>

      <div className="px-5 py-6 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-title text-[19px] text-foreground">Mes tests</h3>
          <p className="text-sm font-medium text-muted">{tracked.length} à faire</p>
        </div>
        <ul className="mt-3 divide-y divide-border-soft border-y border-border-soft">
          {tracked.map((tool) => (
            <li key={tool.key}>
              <Link href={tool.href} className="group flex min-h-20 items-center gap-3 py-4 transition hover:bg-surface/60 sm:px-2">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${tool.completed ? "border-foreground bg-accent text-on-accent" : "border-border text-muted"}`}>
                  <Square size={14} strokeWidth={1.5} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold text-foreground">{tool.name}</span>
                  <span className="mt-0.5 block text-sm leading-snug text-muted">{tool.description}</span>
                </span>
                <span className="hidden shrink-0 text-sm font-medium text-foreground sm:block">Commencer</span>
                <ChevronRight size={18} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </div>

    </section>
  );
}
