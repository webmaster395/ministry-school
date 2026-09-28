import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMembers, getOpportunitiesWithDates, getProgramEntries } from "@/lib/data/admin-hub";
import OverviewTab from "@/components/admin/OverviewTab";
import ProgramTab from "@/components/admin/ProgramTab";
import ProjectsTab from "@/components/admin/ProjectsTab";
import MembersTab from "@/components/admin/MembersTab";
import QuestionsTab from "@/components/admin/QuestionsTab";
import StatisticsTab from "@/components/admin/StatisticsTab";
import { QUESTIONS_ENABLED } from "@/lib/questions";
import { getMinistries } from "@/lib/data/admin";

const TABS = [
  { key: "vue", label: "Vue d'ensemble" },
  { key: "statistiques", label: "Statistiques" },
  { key: "membres", label: "Membres et accès" },
  { key: "programme", label: "Programme" },
  { key: "projets", label: "Projets et formations" },
  { key: "questions", label: "Questions" },
].filter((t) => QUESTIONS_ENABLED || t.key !== "questions");

type Params = {
  onglet?: string;
  vue?: string;
  type?: string;
  phase?: string;
  filtre?: string;
  q?: string;
  role?: string;
  sens?: string;
  statut?: string;
  tri?: string;
  implication?: string;
  genre?: string;
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const tab = p.onglet === "comptes-rendus" ? "projets" : TABS.some((t) => t.key === p.onglet) ? (p.onglet as string) : "vue";

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const opps = await getOpportunitiesWithDates(supabase);

  return (
    <div className="space-y-6">
      <nav className="tabbar grid grid-cols-2 gap-1 rounded-lg border border-border bg-background p-1 md:auto-cols-fr md:grid-flow-col md:grid-cols-none [&>*:last-child:nth-child(odd)]:col-span-2 md:[&>*:last-child:nth-child(odd)]:col-span-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "vue" ? "/gestion/admin" : `/gestion/admin?onglet=${t.key}`}
            className={`rounded-md py-3 text-center text-[15px] transition ${
              tab === t.key ? "bg-accent font-medium text-on-accent" : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "vue" && (
        <OverviewTab
          members={await getMembers(supabase)}
          opps={opps}
          program={await getProgramEntries(supabase, opps)}
          today={today}
        />
      )}
      {tab === "statistiques" && (
        <StatisticsTab members={await getMembers(supabase)} ministries={await getMinistries(supabase)} />
      )}
      {tab === "programme" && (
        <ProgramTab entries={await getProgramEntries(supabase, opps)} view={p.vue ?? ""} today={today} />
      )}
      {tab === "projets" && <ProjectsTab opps={opps} type={p.onglet === "comptes-rendus" ? "comptes-rendus" : p.type ?? "projet"} phase={p.phase ?? "actuel"} reportFilter={p.filtre ?? "a_recevoir"} today={today} />}
      {QUESTIONS_ENABLED && tab === "questions" && <QuestionsTab filter={p.filtre ?? "a_traiter"} />}
      {tab === "membres" && (
        <MembersTab
          q={p.q ?? ""}
          role={p.role ?? "tous"}
          sens={p.sens ?? "toutes"}
          statut={p.statut ?? "tous"}
          tri={p.tri ?? "nom"}
          implication={p.implication ?? "toutes"}
          genre={p.genre ?? "tous"}
        />
      )}
    </div>
  );
}
