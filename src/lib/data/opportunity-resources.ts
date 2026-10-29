import type { SupabaseClient } from "@supabase/supabase-js";

export type OpportunityResource = {
  id: string;
  opportunity_id: string;
  title: string;
  kind: "support" | "resource" | "link";
  external_url: string | null;
  file_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  created_at: string;
};

export async function getOpportunityResources(supabase: SupabaseClient, opportunityId: string) {
  const { data } = await supabase
    .from("opportunity_resources")
    .select("id,opportunity_id,title,kind,external_url,file_path,file_name,mime_type,created_at")
    .eq("opportunity_id", opportunityId)
    .order("created_at");
  return (data ?? []) as OpportunityResource[];
}
