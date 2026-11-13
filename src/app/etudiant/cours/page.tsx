import { redirect } from "next/navigation";
import MonthCalendar, { type MonthSession } from "@/components/MonthCalendar";
import { createClient } from "@/lib/supabase/server";
import { getStudentAllSessions, getStudentCompletedIds, getStudentProgramAssignments, studentSessionTrainerNames, type StudentSession } from "@/lib/data/student";
import { getAllOpportunityDates, getMyOpportunityDateRegistrationIds, getOpportunities, isPublished, opportunityType, TYPE_LABEL } from "@/lib/data/opportunities";
import { getViewer } from "@/lib/data/viewer";
import { getMinistry, sessionColor } from "@/lib/ministry";
import { PROMOTION } from "@/lib/promotion";

function isProjectDay(session: StudentSession) {
  const value = `${session.track ?? ""} ${session.description ?? ""} ${session.courses?.title ?? ""}`.toLowerCase();
  // Une « Formation du cœur » reste un cours. Seule la journée générique
  // Projets et formations ouvre le catalogue des choix.
  return value.includes("projet");
}

export default async function StudentCoursesPage({ searchParams }: { searchParams: Promise<{ mois?: string; jour?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const sessions = await getStudentAllSessions(supabase, viewer.id);
  const [assignments, completedIds, opportunities, opportunityDates, registeredDateIds] = await Promise.all([
    getStudentProgramAssignments(supabase, sessions.map((session) => session.id)),
    getStudentCompletedIds(supabase, viewer.id),
    getOpportunities(supabase),
    getAllOpportunityDates(supabase),
    getMyOpportunityDateRegistrationIds(supabase, viewer.id),
  ]);

  const ministryColor = getMinistry(viewer.ministrySlug)?.color ?? "var(--foreground)";
  const assignmentsBySession = new Map<string, typeof assignments>();
  for (const assignment of assignments) assignmentsBySession.set(assignment.session_id, [...(assignmentsBySession.get(assignment.session_id) ?? []), assignment]);

  const regularSessions: MonthSession[] = sessions.filter((session) => !isProjectDay(session)).map((session) => {
    const work = assignmentsBySession.get(session.id) ?? [];
    const remaining = work.filter((assignment) => !completedIds.has(assignment.id)).length;
    return {
      id: session.id,
      date: session.session_date,
      start: session.start_time,
      end: session.end_time,
      title: session.courses?.title ?? session.description ?? "Cours",
      description: remaining > 0 ? `${remaining} ${remaining > 1 ? "travaux" : "travail"} à préparer` : work.length > 0 ? "Tout le travail est terminé" : null,
      label: session.track?.replace(/^Votre parcours\s*:\s*/i, "") ?? (session.session_type === "commun" ? "Tronc commun" : (viewer.ministryName ?? "Ministère")),
      location: session.room ? `${session.location} · ${session.room}` : session.location,
      teacher: studentSessionTrainerNames(session),
      color: sessionColor(session.track, session.session_type, ministryColor),
    };
  });

  const opportunityById = new Map(opportunities.filter((opportunity) => isPublished(opportunity)).map((opportunity) => [opportunity.id, opportunity]));
  const publishedOpportunityDates = opportunityDates.filter((date) => opportunityById.has(date.opportunity_id));
  const registeredDates = publishedOpportunityDates.filter((date) => registeredDateIds.has(date.id));
  const registeredDays = new Set(registeredDates.map((date) => date.session_date));
  const registeredSessions: MonthSession[] = registeredDates.map((date) => {
    const opportunity = opportunityById.get(date.opportunity_id)!;
    return {
      id: `opportunity-${date.id}`,
      date: date.session_date,
      start: date.start_time,
      end: date.end_time,
      title: opportunity.title,
      description: "Vous êtes inscrit à ce projet ou à cette formation.",
      label: TYPE_LABEL[opportunityType(opportunity)],
      location: [date.location ?? opportunity.location, date.room].filter(Boolean).join(" · ") || null,
      teacher: opportunity.organizer_label ?? opportunity.services?.name ?? null,
      color: "var(--f-projet)",
      href: `/etudiant/services/${opportunity.id}`,
    };
  });
  const opportunityDateByDay = new Map<string, (typeof publishedOpportunityDates)[number]>();
  for (const date of publishedOpportunityDates) {
    const current = opportunityDateByDay.get(date.session_date);
    if (!current || date.start_time.localeCompare(current.start_time) < 0) opportunityDateByDay.set(date.session_date, date);
  }
  // La date réelle des propositions est la source de vérité. Une journée
  // « Projets et formations » reste donc visible, même sans séance générique.
  const choiceSessions: MonthSession[] = [...opportunityDateByDay.values()]
    .filter((date) => !registeredDays.has(date.session_date))
    .map((date) => ({
      id: `choice-opportunity-${date.session_date}`,
      date: date.session_date,
      start: date.start_time,
      end: date.end_time,
      title: "Projets et formations",
      description: "Choisissez le projet ou la formation auquel vous souhaitez participer.",
      label: "Projets et formations",
      location: [date.location, date.room].filter(Boolean).join(" · ") || null,
      teacher: null,
      color: "var(--f-projet)",
      href: `/etudiant/services?jour=${date.session_date}&mois=${date.session_date.slice(0, 7)}`,
    }));

  // Compatibilité avec les anciennes journées qui n'avaient pas encore de
  // propositions rattachées dans opportunity_dates.
  const knownChoiceDays = new Set(choiceSessions.map((session) => session.date));
  for (const session of sessions.filter((item) => isProjectDay(item) && !registeredDays.has(item.session_date) && !knownChoiceDays.has(item.session_date))) {
    choiceSessions.push({
      id: `choice-${session.id}`,
      date: session.session_date,
      start: session.start_time,
      end: session.end_time,
      title: "Projets et formations",
      description: "Choisissez le projet ou la formation auquel vous souhaitez participer.",
      label: "Projets et formations",
      location: session.room ? `${session.location} · ${session.room}` : session.location,
      teacher: null,
      color: "var(--f-projet)",
      href: `/etudiant/services?jour=${session.session_date}&mois=${session.session_date.slice(0, 7)}`,
    });
  }

  const calendarSessions = [...regularSessions, ...choiceSessions, ...registeredSessions].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  const initialDate = params.jour && /^\d{4}-\d{2}-\d{2}$/.test(params.jour) ? params.jour : params.mois && /^\d{4}-\d{2}$/.test(params.mois) ? `${params.mois}-01` : undefined;

  return <div className="mx-auto max-w-6xl space-y-4 pb-8">
    <header><p className="text-[13px] font-medium text-muted">Promotion {PROMOTION}</p><h1 className="mt-0.5 font-title text-[25px] leading-tight text-foreground sm:text-[29px]">Mes cours</h1><p className="mt-1 text-[14px] text-muted">Retrouvez votre calendrier, vos cours et le travail à préparer.</p></header>
    <MonthCalendar sessions={calendarSessions} initialDate={initialDate} />
  </div>;
}
