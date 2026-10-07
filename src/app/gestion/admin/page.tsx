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
import { getMinistries, getTrainingDayDates } from "@/lib/data/admin";
import TrainersTab, { type TrainerAdminRow } from "@/components/admin/TrainersTab";
import { getServices } from "@/lib/data/opportunities";

const VALID_TABS = ["vue", "statistiques", "personnes", "membres", "formateurs", "programme", "projets", "questions"];

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
  page?: string;
  par?: string;
  mois?: string;
  personnes?: string;
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const requestedTab = p.onglet === "comptes-rendus" ? "projets" : p.onglet;
  const tab = VALID_TABS.includes(requestedTab ?? "") ? requestedTab! : "vue";
  const peopleView = p.personnes === "formateurs" || tab === "formateurs" ? "formateurs" : "membres";

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const opps = await getOpportunitiesWithDates(supabase);
  let trainers: TrainerAdminRow[] = [];
  if (tab === "formateurs" || tab === "personnes" || tab === "programme") {
    const { data } = await supabase
      .from("trainers")
      .select("id, first_name, last_name, title, bio, photo_path, is_active")
      .order("is_active", { ascending: false })
      .order("last_name")
      .order("first_name");
    trainers = ((data ?? []) as Omit<TrainerAdminRow, "photoUrl">[]).map((trainer) => ({
      ...trainer,
      photoUrl: trainer.photo_path
        ? supabase.storage.from("trainer-photos").getPublicUrl(trainer.photo_path).data.publicUrl
        : null,
    }));
  }

  return (
    <div className="space-y-6">
      {tab === "vue" && (
        <OverviewTab
          members={await getMembers(supabase)}
          opps={opps}
          program={await getProgramEntries(supabase, opps)}
          today={today}
        />
      )}
      {tab === "statistiques" && (
        <StatisticsTab
          members={await getMembers(supabase)}
          ministries={await getMinistries(supabase)}
          trainingDates={await getTrainingDayDates(supabase)}
        />
      )}
      {tab === "programme" && (
        <ProgramTab
          entries={await getProgramEntries(supabase, opps)}
          month={p.mois}
          today={today}
          trainers={trainers.filter((trainer) => trainer.is_active).map((trainer) => ({ id: trainer.id, name: `${trainer.first_name} ${trainer.last_name}`.trim() }))}
          ministries={(await getMinistries(supabase)).map((ministry) => ({ id: ministry.id, name: ministry.name }))}
          services={(await getServices(supabase)).map((service) => ({ id: service.id, name: service.name }))}
        />
      )}
      {tab === "projets" && <ProjectsTab opps={opps} type={p.onglet === "comptes-rendus" ? "comptes-rendus" : p.type ?? "projet"} phase={p.phase ?? "actuel"} reportFilter={p.filtre ?? "a_recevoir"} today={today} />}
      {QUESTIONS_ENABLED && tab === "questions" && <QuestionsTab filter={p.filtre ?? "a_traiter"} />}
      {(tab === "personnes" || tab === "membres" || tab === "formateurs") && (
        <div className="space-y-6">
          <header>
            <p className="text-sm text-muted">Administration</p>
            <h1 className="font-title mt-1 text-[30px] text-foreground">Membres</h1>
            <div className="mt-4 flex gap-2">
              <Link href="/gestion/admin?onglet=personnes" className={`rounded-full px-4 py-2 text-sm ${peopleView === "membres" ? "bg-accent text-on-accent" : "bg-surface text-muted"}`}>Étudiants et accès</Link>
              <Link href="/gestion/admin?onglet=personnes&personnes=formateurs" className={`rounded-full px-4 py-2 text-sm ${peopleView === "formateurs" ? "bg-accent text-on-accent" : "bg-surface text-muted"}`}>Formateurs</Link>
            </div>
          </header>
          {peopleView === "membres" ? <MembersTab
          q={p.q ?? ""}
          role={p.role ?? "tous"}
          sens={p.sens ?? "toutes"}
          statut={p.statut ?? "tous"}
          tri={p.tri ?? "nom"}
          implication={p.implication ?? "toutes"}
          genre={p.genre ?? "tous"}
          page={p.page ?? "1"}
          par={p.par ?? "50"}
          /> : <TrainersTab trainers={trainers} />}
        </div>
      )}
    </div>
  );
}
