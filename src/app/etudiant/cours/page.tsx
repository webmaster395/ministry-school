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
  return value.includes("projet") || value.includes("formation");
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
  const registeredDates = opportunityDates.filter((date) => registeredDateIds.has(date.id) && opportunityById.has(date.opportunity_id));
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
      location: date.room ? `${date.location ?? opportunity.location ?? ""} · ${date.room}` : (date.location ?? opportunity.location),
      teacher: opportunity.organizer_label ?? opportunity.services?.name ?? null,
      color: "var(--f-projet)",
      href: `/etudiant/services/${opportunity.id}`,
    };
  });
  const choiceSessions: MonthSession[] = sessions.filter((session) => isProjectDay(session) && !registeredDays.has(session.session_date)).map((session) => ({
    id: `choice-${session.id}`,
    date: session.session_date,
    start: session.start_time,
    end: session.end_time,
    title: "Choisir mon projet ou ma formation",
    description: "Découvrez les propositions disponibles pour cette journée et inscrivez-vous.",
    label: "Projets et formations",
    location: session.room ? `${session.location} · ${session.room}` : session.location,
    teacher: null,
    color: "var(--f-projet)",
    href: `/etudiant/services?jour=${session.session_date}`,
  }));

  const calendarSessions = [...regularSessions, ...choiceSessions, ...registeredSessions].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  const initialDate = params.jour && /^\d{4}-\d{2}-\d{2}$/.test(params.jour) ? params.jour : params.mois && /^\d{4}-\d{2}$/.test(params.mois) ? `${params.mois}-01` : undefined;

  return <div className="mx-auto max-w-6xl space-y-4 pb-8">
    <header><p className="text-[13px] font-medium text-muted">Promotion {PROMOTION}</p><h1 className="mt-0.5 font-title text-[25px] leading-tight text-foreground sm:text-[29px]">Mes cours</h1><p className="mt-1 text-[14px] text-muted">Retrouvez votre calendrier, vos cours et le travail à préparer.</p></header>
    <MonthCalendar sessions={calendarSessions} initialDate={initialDate} />
  </div>;
}
