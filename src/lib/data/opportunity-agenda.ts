import type { SupabaseClient } from "@supabase/supabase-js";

export const AGENDA_TYPES = ["theory", "practice", "workshop", "testimonials", "prayer", "worship", "bible_reading", "other"] as const;
export type AgendaType = typeof AGENDA_TYPES[number];

export const AGENDA_TYPE_LABELS: Record<AgendaType, string> = {
  theory: "Théorie",
  practice: "Pratique",
  workshop: "Atelier",
  testimonials: "Témoignages",
  prayer: "Prière",
  worship: "Louange",
  bible_reading: "Lecture de la Bible",
  other: "Autre",
};

export type OpportunityAgendaStep = {
  id: string;
  opportunity_date_id: string;
  position: number;
  duration_minutes: number;
  activity_type: AgendaType;
  custom_type: string | null;
  explanation: string;
};

export async function getOpportunityAgenda(supabase: SupabaseClient, opportunityId: string) {
  const { data, error } = await supabase.rpc("opportunity_agenda", { p_opportunity: opportunityId });
  if (error) return [];
  return (data ?? []) as OpportunityAgendaStep[];
}
