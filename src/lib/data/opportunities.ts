import { SupabaseClient } from "@supabase/supabase-js";
import { DETAIL_COLUMNS } from "@/lib/opportunity-details";

export type OpportunityKind = "formation" | "projet";
export type OpportunityType = OpportunityKind | "both";
export type PublicationStatus = "draft" | "published" | "scheduled" | "unpublished" | "archived";
export type Responsibility = "manager" | "contributor";

export type Opportunity = {
  id: string;
  kind: OpportunityKind;
  title: string;
  description: string;
  service_id: string | null;
  organizer_label: string | null;
  schedule_label: string | null;
  starts_on: string | null;
  ends_on: string | null;
  capacity: number | null;
  registration_open: boolean;
  created_by: string;
  /** Responsable attribué par un Admin (formations) */
  lead_id: string | null;
  is_project: boolean;
  is_training: boolean;
  short_description: string | null;
  speakers: string | null;
  location: string | null;
  organization_material: string | null;
  participant_material: string | null;
  cancellation_allowed: boolean;
  publication_status: PublicationStatus;
  published_at: string | null;
  archived_at: string | null;
  services: { name: string } | null;
  objectives?: string | null;
  prerequisites?: string | null;
};

export type OpportunityStatus = "disponible" | "a_venir" | "complet" | "termine";

export const KIND_LABEL: Record<OpportunityKind, string> = {
  formation: "Formation",
  projet: "Projet",
};

export const TYPE_LABEL: Record<OpportunityType, string> = {
  formation: "Formation",
  projet: "Projet",
  both: "Projet et formation",
};

/** Palette des formations (--f-*) : aucun lien avec les couleurs des ministères. */
export const KIND_COLOR: Record<OpportunityKind, string> = {
  formation: "var(--foreground)",
  projet: "var(--f-projet)",
};

export const STATUS_LABEL: Record<OpportunityStatus, string> = {
  disponible: "Disponible",
  a_venir: "Inscriptions fermées",
  complet: "Complet",
  termine: "Terminé",
};

export function statusOf(o: Opportunity, taken: number, today: string): OpportunityStatus {
  if (o.ends_on && o.ends_on < today) return "termine";
  if (!o.registration_open) return "a_venir";
  if (o.capacity !== null && taken >= o.capacity) return "complet";
  return "disponible";
}

export function opportunityType(o: Pick<Opportunity, "is_project" | "is_training">): OpportunityType {
  return o.is_project && o.is_training ? "both" : o.is_project ? "projet" : "formation";
}

export function matchesKind(o: Opportunity, kind: OpportunityKind) {
  return kind === "projet" ? o.is_project : o.is_training;
}

export function isPublished(o: Opportunity, now = new Date()) {
  return !o.archived_at && (
    o.publication_status === "published" ||
    (o.publication_status === "scheduled" && !!o.published_at && new Date(o.published_at) <= now)
  );
}

export function placesLabel(o: Opportunity, taken: number) {
  if (o.capacity === null) return null;
  const left = Math.max(0, o.capacity - taken);
  return left === 0 ? "Complet" : `${left} place${left > 1 ? "s" : ""} restante${left > 1 ? "s" : ""}`;
}

export async function getOpportunities(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("opportunities")
    .select(
      "id, kind, title, description, service_id, organizer_label, schedule_label, starts_on, ends_on, capacity, registration_open, created_by, lead_id, services(name), is_project, is_training, short_description, speakers, location, organization_material, participant_material, cancellation_allowed, publication_status, published_at, archived_at" + DETAIL_COLUMNS
    )
    .order("starts_on", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  return (data ?? []) as unknown as Opportunity[];
}

export async function getOpportunityCounts(supabase: SupabaseClient) {
  const { data } = await supabase.rpc("opportunity_counts");
  return new Map<string, number>(
    ((data ?? []) as { opportunity_id: string; taken: number }[]).map((r) => [
      r.opportunity_id,
      Number(r.taken),
    ])
  );
}

export async function getMyRegistrationIds(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("opportunity_registrations")
    .select("opportunity_id")
    .eq("user_id", userId);
  return new Set((data ?? []).map((r) => r.opportunity_id as string));
}

export async function getOpportunity(supabase: SupabaseClient, id: string) {
  const rows = await getOpportunities(supabase);
  return rows.find((row) => row.id === id) ?? null;
}

export async function getOpportunityDates(supabase: SupabaseClient, id: string) {
  const { data } = await supabase
    .from("opportunity_dates")
    .select("id, session_date, start_time, end_time, room, location")
    .eq("opportunity_id", id)
    .order("session_date")
    .order("start_time");
  return (data ?? []) as {
    id: string;
    session_date: string;
    start_time: string;
    end_time: string;
    room: string | null;
    location: string | null;
  }[];
}

export async function getMyAssignments(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("opportunity_assignments")
    .select("opportunity_id, responsibility")
    .eq("user_id", userId);
  return new Map(
    ((data ?? []) as { opportunity_id: string; responsibility: Responsibility }[]).map((row) => [
      row.opportunity_id,
      row.responsibility,
    ])
  );
}

export async function getProjectsTrainingRights(supabase: SupabaseClient, userId: string) {
  const [{ data: profile }, assignments] = await Promise.all([
    supabase.from("profiles").select("role, is_projects_training_member").eq("id", userId).single(),
    getMyAssignments(supabase, userId),
  ]);
  return { admin: profile?.role === "admin", member: !!profile?.is_projects_training_member, assignments };
}

/** La création est strictement réservée aux administrateurs. */
export async function getProposalRights(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  const admin = data?.role === "admin";
  return {
    // Les projets et formations sont créés par un administrateur.
    formation: admin,
    projet: admin,
  };
}

export async function getServices(supabase: SupabaseClient) {
  const { data } = await supabase.from("services").select("id, name").order("name");
  return (data ?? []) as { id: string; name: string }[];
}
