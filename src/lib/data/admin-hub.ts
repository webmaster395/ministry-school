import { SupabaseClient } from "@supabase/supabase-js";
import type { OpportunityKind } from "@/lib/data/opportunities";

export type Member = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_teacher: boolean;
  is_service_lead: boolean;
  is_project_lead: boolean;
  service_id: string | null;
  ministry_lead_of: string | null;
  ministry_id: string | null;
  email_confirmed: boolean;
  deactivated: boolean;
  created_at: string;
};

export type MemberStatus = "actif" | "a_confirmer" | "desactive";

export const memberStatus = (m: Member): MemberStatus =>
  m.deactivated ? "desactive" : m.email_confirmed ? "actif" : "a_confirmer";

export async function getMembers(supabase: SupabaseClient) {
  const [{ data: profiles }, { data: emails }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, role, is_teacher, is_service_lead, is_project_lead, service_id, ministry_lead_of, ministry_id, email_confirmed, deactivated, created_at"
      )
      .order("full_name"),
    supabase.rpc("admin_user_emails"),
  ]);
  const emailOf = new Map(((emails ?? []) as { id: string; email: string }[]).map((e) => [e.id, e.email]));
  return ((profiles ?? []) as Omit<Member, "email">[]).map((p) => ({ ...p, email: emailOf.get(p.id) ?? "" }));
}

export type OppRow = {
  id: string;
  kind: OpportunityKind;
  title: string;
  organizer_label: string | null;
  registration_open: boolean;
  created_by: string;
  services: { name: string } | null;
  dates: { session_date: string; start_time: string; end_time: string; room: string | null }[];
  reports: Map<string, { file_path: string; file_name: string }>;
};

/** Toutes les formations de service et tous les projets, avec leurs dates et leurs comptes rendus. */
export async function getOpportunitiesWithDates(supabase: SupabaseClient) {
  const [{ data: opps }, { data: dates }, { data: reports }] = await Promise.all([
    supabase
      .from("opportunities")
      .select("id, kind, title, organizer_label, registration_open, created_by, services(name)")
      .order("created_at"),
    supabase
      .from("opportunity_dates")
      .select("opportunity_id, session_date, start_time, end_time, room")
      .order("session_date"),
    supabase.from("opportunity_reports").select("opportunity_id, session_date, file_path, file_name"),
  ]);

  return ((opps ?? []) as unknown as Omit<OppRow, "dates" | "reports">[]).map((o) => ({
    ...o,
    dates: (dates ?? []).filter((d) => d.opportunity_id === o.id),
    reports: new Map(
      (reports ?? [])
        .filter((r) => r.opportunity_id === o.id)
        .map((r) => [r.session_date as string, { file_path: r.file_path as string, file_name: r.file_name as string }])
    ),
  })) as OppRow[];
}

export type ReportState = "recu" | "a_recevoir" | "en_retard";

export const REPORT_DELAY_DAYS = 7;

/** Un compte rendu est attendu pour chaque date passée ; en retard après une semaine. */
export function reportState(o: OppRow, date: string, today: string): ReportState | null {
  if (date > today) return null;
  if (o.reports.has(date)) return "recu";
  const due = new Date(date);
  due.setDate(due.getDate() + REPORT_DELAY_DAYS);
  return due.toISOString().slice(0, 10) < today ? "en_retard" : "a_recevoir";
}

export type OppPhase = "actuel" | "plus_tard" | "termine";

export function phaseOf(o: OppRow, today: string): OppPhase {
  const first = o.dates[0]?.session_date;
  const last = o.dates[o.dates.length - 1]?.session_date;
  if (last && last < today) return "termine";
  if (first && first > today && !o.registration_open) return "plus_tard";
  return "actuel";
}

export function datesLabel(o: OppRow) {
  if (!o.dates.length) return "Dates à définir";
  const fmt = (d: string) =>
    new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(d));
  if (o.dates.length === 1) return fmt(o.dates[0].session_date);
  return `Du ${fmt(o.dates[0].session_date)} au ${fmt(o.dates[o.dates.length - 1].session_date)}`;
}

export type ProgramEntry = {
  key: string;
  date: string;
  start: string;
  end: string;
  title: string;
  sub: string;
  badge: string;
  attention: boolean;
  href: string;
};

const KIND_TEXT: Record<OpportunityKind, string> = { formation: "Formation de service", projet: "Projet" };

/** Le programme de chaque journée : séances de formation le matin, formations de service et projets l'après-midi. */
export async function getProgramEntries(supabase: SupabaseClient, opps: OppRow[]): Promise<ProgramEntry[]> {
  const { data } = await supabase
    .from("sessions")
    .select(
      "id, session_date, start_time, end_time, location, room, description, track, speaker_name, summary, objectives, teacher:profiles!sessions_teacher_id_fkey(full_name)"
    )
    .order("session_date")
    .order("start_time");

  type Row = {
    id: string; session_date: string; start_time: string; end_time: string; location: string;
    room: string | null; description: string | null; track: string | null; speaker_name: string | null;
    summary: string | null; objectives: string | null; teacher: { full_name: string } | null;
  };

  const sessions: ProgramEntry[] = ((data ?? []) as unknown as Row[]).map((s) => {
    const ready = !!(s.summary?.trim() && s.objectives?.trim());
    return {
      key: `s-${s.id}`,
      date: s.session_date,
      start: s.start_time,
      end: s.end_time,
      title: s.description ?? "À définir",
      sub: [s.track, s.teacher?.full_name ?? s.speaker_name, s.location, s.room].filter(Boolean).join(" · "),
      badge: ready ? "Prêt" : "À compléter",
      attention: !ready,
      href: `/etudiant/preparation/${s.id}`,
    };
  });

  const fromOpps: ProgramEntry[] = opps.flatMap((o) =>
    o.dates.map((d) => ({
      key: `o-${o.id}-${d.session_date}`,
      date: d.session_date,
      start: d.start_time,
      end: d.end_time,
      title: o.title,
      sub: [KIND_TEXT[o.kind], o.organizer_label, "MLK Studio", d.room].filter(Boolean).join(" · "),
      badge: o.registration_open ? "Publié" : "Inscriptions à venir",
      attention: false,
      href: `/etudiant/services/${o.id}`,
    }))
  );

  return [...sessions, ...fromOpps].sort(
    (a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.title.localeCompare(b.title)
  );
}
