import { SupabaseClient } from "@supabase/supabase-js";
import { DETAIL_COLUMNS } from "@/lib/opportunity-details";

export type OpportunityKind = "formation" | "projet";

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
  services: { name: string } | null;
  objectives?: string | null;
  prerequisites?: string | null;
};

export type OpportunityStatus = "disponible" | "a_venir" | "complet" | "termine";

export const KIND_LABEL: Record<OpportunityKind, string> = {
  formation: "Formation par un service",
  projet: "Projet",
};

/** Palette des formations (--f-*) : aucun lien avec les couleurs des ministères. */
export const KIND_COLOR: Record<OpportunityKind, string> = {
  formation: "var(--foreground)",
  projet: "var(--f-projet)",
};

export const STATUS_LABEL: Record<OpportunityStatus, string> = {
  disponible: "Disponible",
  a_venir: "Inscriptions à venir",
  complet: "Complet",
  termine: "Terminé",
};

export function statusOf(o: Opportunity, taken: number, today: string): OpportunityStatus {
  if (o.ends_on && o.ends_on < today) return "termine";
  if (!o.registration_open) return "a_venir";
  if (o.capacity !== null && taken >= o.capacity) return "complet";
  return "disponible";
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
      "id, kind, title, description, service_id, organizer_label, schedule_label, starts_on, ends_on, capacity, registration_open, created_by, lead_id, services(name)" + DETAIL_COLUMNS
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

/** Ce que l'utilisateur a le droit de proposer : formation (responsable de service) et/ou projet (chef de projet). */
export async function getProposalRights(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("role, is_service_lead, is_project_lead")
    .eq("id", userId)
    .single();
  const admin = data?.role === "admin";
  return {
    // Une formation est créée par un Admin, puis attribuée à un responsable de service
    formation: admin,
    projet: admin || !!data?.is_project_lead,
  };
}

export async function getServices(supabase: SupabaseClient) {
  const { data } = await supabase.from("services").select("id, name").order("name");
  return (data ?? []) as { id: string; name: string }[];
}
