import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMembers, getOpportunitiesWithDates, getProgramEntries } from "@/lib/data/admin-hub";
import OverviewTab from "@/components/admin/OverviewTab";
import ProgramTab from "@/components/admin/ProgramTab";
import ProjectsTab from "@/components/admin/ProjectsTab";
import ReportsTab from "@/components/admin/ReportsTab";
import MembersTab from "@/components/admin/MembersTab";
import QuestionsTab from "@/components/admin/QuestionsTab";
import { QUESTIONS_ENABLED } from "@/lib/questions";

const TABS = [
  { key: "vue", label: "Vue d'ensemble" },
  { key: "programme", label: "Programme" },
  { key: "projets", label: "Projets et formations" },
  { key: "comptes-rendus", label: "Comptes rendus" },
  { key: "membres", label: "Membres et accès" },
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
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const tab = TABS.some((t) => t.key === p.onglet) ? (p.onglet as string) : "vue";

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const opps = await getOpportunitiesWithDates(supabase);

  return (
    <div className="space-y-6">
      <nav className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-background p-1 md:grid-cols-6">
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
      {tab === "programme" && (
        <ProgramTab entries={await getProgramEntries(supabase, opps)} view={p.vue ?? ""} today={today} />
      )}
      {tab === "projets" && <ProjectsTab opps={opps} type={p.type ?? "projet"} phase={p.phase ?? "actuel"} today={today} />}
      {tab === "comptes-rendus" && <ReportsTab opps={opps} filter={p.filtre ?? "a_recevoir"} today={today} />}
      {QUESTIONS_ENABLED && tab === "questions" && <QuestionsTab filter={p.filtre ?? "a_traiter"} />}
      {tab === "membres" && (
        <MembersTab
          q={p.q ?? ""}
          role={p.role ?? "tous"}
          sens={p.sens ?? "toutes"}
          statut={p.statut ?? "tous"}
          tri={p.tri ?? "nom"}
        />
      )}
    </div>
  );
}
