import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";
import { getMinistries } from "@/lib/data/admin";
import { getOpportunitiesWithDates, getProgramEntries } from "@/lib/data/admin-hub";
import ProgramTab from "@/components/admin/ProgramTab";

type ProgramTrainer = { id: string; first_name: string; last_name: string };

export default async function UnifiedAdminProgramPage({ searchParams }: { searchParams: Promise<{ mois?: string }> }) {
  const [{ mois }, viewer] = await Promise.all([searchParams, getViewer()]);
  const supabase = await createClient();
  const opportunities = await getOpportunitiesWithDates(supabase);
  let trainers: ProgramTrainer[] = [];
  if (viewer?.roles.superAdmin) {
    const { data } = await supabase.from("trainers").select("id, first_name, last_name, title, bio, photo_path, is_active").eq("is_active", true).order("last_name");
    trainers = (data ?? []) as ProgramTrainer[];
  }
  return <ProgramTab entries={await getProgramEntries(supabase, opportunities)} month={mois} today={new Date().toISOString().slice(0, 10)} trainers={trainers.map((item) => ({ id: item.id, name: `${item.first_name} ${item.last_name}`.trim() }))} ministries={(await getMinistries(supabase)).map((item) => ({ id: item.id, name: item.name }))} readOnly={!viewer?.roles.superAdmin} basePath="/gestion/admin/programme" />;
}
