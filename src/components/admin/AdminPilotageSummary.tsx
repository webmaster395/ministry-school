import { createClient } from "@/lib/supabase/server";
import { getEnrollmentBreakdown } from "@/lib/data/admin";
import { getMembers, getOpportunitiesWithDates, getProgramEntries, phaseOf } from "@/lib/data/admin-hub";
import { accountsByTrainingCycle } from "@/lib/training-cycle-stats";
import { formatSessionDate } from "@/lib/format";
import ManagementPageHeader from "@/components/management/ManagementPageHeader";

export default async function AdminPilotageSummary() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const [members, opportunities, breakdown] = await Promise.all([
    getMembers(supabase),
    getOpportunitiesWithDates(supabase),
    getEnrollmentBreakdown(supabase),
  ]);
  const program = await getProgramEntries(supabase, opportunities);
  const trainingDates = [...new Set(program.filter((item) => item.kind === "course").map((item) => item.date))].sort();
  const cycles = accountsByTrainingCycle(members, trainingDates);
  const currentCycle = cycles.find((cycle) => cycle.date >= today) ?? cycles.at(-1);
  const pending = members.filter((member) => !member.email_confirmed && !member.deactivated).length;
  const nextDate = program.find((entry) => entry.date >= today)?.date;
  const projects = opportunities.filter((item) => item.kind === "projet");
  const currentProjects = projects.filter((item) => phaseOf(item, today) !== "termine").length;
  const finishedProjects = projects.length - currentProjects;
  const gender = `${breakdown.byGender.men} homme${breakdown.byGender.men > 1 ? "s" : ""} · ${breakdown.byGender.women} femme${breakdown.byGender.women > 1 ? "s" : ""}`;
  const cards = [
    { value: members.length, label: "Membres inscrits", detail: gender },
    { value: currentCycle?.value ?? 0, label: "Nouveaux comptes", detail: currentCycle?.label ?? "Période actuelle" },
    { value: pending, label: "En attente de confirmation" },
    { value: nextDate ? formatSessionDate(nextDate).replace(/^\w+ /, "") : "—", label: "Prochaine journée" },
    { value: currentProjects, label: "Projets", detail: `${currentProjects} actuel${currentProjects > 1 ? "s" : ""} · ${finishedProjects} terminé${finishedProjects > 1 ? "s" : ""}` },
  ];
  return <div className="space-y-5">
    <ManagementPageHeader eyebrow="ADMIN" title="Pilotage" subtitle="Les cinq indicateurs essentiels, calculés à partir des données réelles." />
    <section className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-5">{cards.map((card) => <article key={card.label} className="min-w-0 rounded-lg border border-border bg-background p-3.5 sm:p-5"><p className="font-title break-words text-[25px] leading-none text-foreground sm:text-[30px]">{card.value}</p><p className="mt-2 text-[12px] leading-snug text-muted sm:mt-3 sm:text-sm">{card.label}</p>{card.detail && <p className="mt-1 text-[11px] leading-snug text-muted">{card.detail}</p>}</article>)}</section>
  </div>;
}
