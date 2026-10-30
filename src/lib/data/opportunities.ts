import { SupabaseClient } from "@supabase/supabase-js";
import { DETAIL_COLUMNS } from "@/lib/opportunity-details";
import type { StrategicAxis } from "@/lib/opportunity-strategy";

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
  tools_used: string | null;
  cancellation_allowed: boolean;
  publication_status: PublicationStatus;
  published_at: string | null;
  archived_at: string | null;
  archive_requested_at: string | null;
  archive_requested_by: string | null;
  cover_image_path: string | null;
  banner_emoji: string;
  services: { name: string } | null;
  objectives?: string | null;
  prerequisites?: string | null;
  participation_audience: "all" | "specific";
  participation_audience_details: string | null;
  participation_prerequisites_required: boolean;
  strategic_axes: StrategicAxis[];
  strategic_contribution_former: string | null;
  strategic_contribution_auberge: string | null;
  strategic_contribution_fundraising: string | null;
  strategic_axes_connection: string | null;
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
  return studentPlacesLabel(left);
}

/** L'alerte de rareté n'est affichée que pour les cinq dernières places. */
export function lastPlacesLabel(remaining: number | null) {
  if (remaining === null || remaining < 1 || remaining > 5) return null;
  return remaining === 1
    ? "Plus qu’une place disponible"
    : `Plus que ${remaining} places disponibles`;
}

/** Libellé étudiant : aucune capacité chiffrée tant qu'il reste au moins six places. */
export function studentPlacesLabel(remaining: number | null) {
  if (remaining === 0) return "Complet";
  return lastPlacesLabel(remaining);
}

export async function getOpportunities(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("opportunities")
    .select(
      "id, kind, title, description, service_id, organizer_label, schedule_label, starts_on, ends_on, capacity, registration_open, created_by, lead_id, services(name), is_project, is_training, short_description, speakers, location, participant_material, tools_used, cancellation_allowed, publication_status, published_at, archived_at, archive_requested_at, archive_requested_by, cover_image_path, banner_emoji" + DETAIL_COLUMNS
    )
    .order("starts_on", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as unknown as Omit<Opportunity, "organization_material">[];
  return rows.map((row) => ({ ...row, organization_material: null }));
}

export async function getOpportunityInternalMaterial(supabase: SupabaseClient, opportunityId: string) {
  const { data, error } = await supabase.rpc("opportunity_internal_material", { p_opportunity: opportunityId });
  if (error) return null;
  return typeof data === "string" ? data : null;
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
    .from("opportunity_date_registrations")
    .select("opportunity_dates(opportunity_id)")
    .eq("user_id", userId);
  return new Set((data ?? []).flatMap((row) => {
    const date = row.opportunity_dates as unknown as { opportunity_id: string } | null;
    return date ? [date.opportunity_id] : [];
  }));
}

export async function getMyOpportunityDateRegistrationIds(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("opportunity_date_registrations")
    .select("opportunity_date_id")
    .eq("user_id", userId);
  return new Set((data ?? []).map((row) => row.opportunity_date_id as string));
}

export async function getOpportunityDateCounts(supabase: SupabaseClient, id: string) {
  const { data } = await supabase.rpc("opportunity_date_counts", { p_opportunity: id });
  return new Map<string, number>(((data ?? []) as { opportunity_date_id: string; taken: number }[])
    .map((row) => [row.opportunity_date_id, Number(row.taken)]));
}

export async function getOpportunity(supabase: SupabaseClient, id: string) {
  const rows = await getOpportunities(supabase);
  return rows.find((row) => row.id === id) ?? null;
}

export async function getOpportunityDates(supabase: SupabaseClient, id: string) {
  const { data } = await supabase
    .from("opportunity_dates")
    .select("id, session_date, start_time, end_time, room, location, capacity")
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
    capacity: number | null;
  }[];
}

export type OpportunityManagementRevision = {
  payload: Partial<Opportunity> & {
    service_id?: string | null;
    service_name?: string | null;
  };
  dates: Awaited<ReturnType<typeof getOpportunityDates>>;
  updatedAt: string;
  updatedByName: string | null;
};

/** Brouillon privé d'une fiche déjà publiée, jamais utilisé par l'espace étudiant. */
export async function getOpportunityManagementRevision(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase.rpc("opportunity_management_revision", { p_opportunity: id });
  if (error || !data) return null;
  return data as OpportunityManagementRevision;
}

export function mergeOpportunityManagementRevision(
  opportunity: Opportunity,
  dates: Awaited<ReturnType<typeof getOpportunityDates>>,
  revision: OpportunityManagementRevision | null,
) {
  if (!revision) return { opportunity, dates, revision: null };
  const payload = revision.payload;
  const merged: Opportunity = {
    ...opportunity,
    ...payload,
    services: payload.service_name
      ? { name: payload.service_name }
      : payload.service_id === null
        ? null
        : opportunity.services,
    // Le brouillon ne peut jamais changer lui-même son état public.
    publication_status: opportunity.publication_status,
    published_at: opportunity.published_at,
    archived_at: opportunity.archived_at,
    archive_requested_at: opportunity.archive_requested_at,
    archive_requested_by: opportunity.archive_requested_by,
    organization_material: opportunity.organization_material,
  };
  return { opportunity: merged, dates: revision.dates ?? dates, revision };
}

export async function getMyAssignments(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("opportunity_assignments")
    .select("opportunity_id, responsibility, can_edit")
    .eq("user_id", userId);
  const rows = (data ?? []) as { opportunity_id: string; responsibility: Responsibility; can_edit: boolean }[];
  return {
    responsibilities: new Map(rows.map((row) => [
      row.opportunity_id,
      row.responsibility,
    ])),
    editable: new Set(rows.filter((row) => row.responsibility === "manager" || row.can_edit).map((row) => row.opportunity_id)),
  };
}

export async function getProjectsTrainingRights(supabase: SupabaseClient, userId: string) {
  const [{ data: superAdmin }, assignments, { data: profile }] = await Promise.all([
    supabase.rpc("is_super_admin", { p_user: userId }),
    getMyAssignments(supabase, userId),
    supabase.from("profiles").select("can_create_opportunities").eq("id", userId).single(),
  ]);
  const managesAtLeastOne = [...assignments.responsibilities.values()].some((role) => role === "manager");
  return { admin: !!superAdmin, member: assignments.responsibilities.size > 0, assignments: assignments.responsibilities, editableAssignments: assignments.editable, canCreate: !!profile?.can_create_opportunities || managesAtLeastOne };
}

/** La création est réservée aux super administrateurs et responsables habilités. */
export async function getProposalRights(supabase: SupabaseClient, userId: string) {
  const { data: allowed } = await supabase.rpc("can_create_opportunities", { p_user: userId });
  return {
    formation: !!allowed,
    projet: !!allowed,
  };
}

export async function getServices(supabase: SupabaseClient) {
  const { data } = await supabase.from("services").select("id, name").order("name");
  return (data ?? []) as { id: string; name: string }[];
}
