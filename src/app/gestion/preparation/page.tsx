import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";
import PreparationHub from "@/components/preparation/PreparationHub";
import { createEmptyProgram, type ProgramDraft } from "@/lib/preparation/program";
import { createEmptySynthesis, type SynthesisDraft } from "@/lib/preparation/synthesis";

export default async function PreparationPage() {
  const viewer = await getViewer();
  const supabase = await createClient();
  const { data: feed, error: feedError } = await supabase.rpc("preparation_drafts_feed");
  let programDrafts = (feed as { programs?: ProgramDraft[] } | null)?.programs ?? [];
  let synthesisDrafts = (feed as { syntheses?: SynthesisDraft[] } | null)?.syntheses ?? [];
  let programError: string | null = null;
  let synthesisError: string | null = null;
  if (feedError?.code === "PGRST202" || feedError?.code === "42883") {
    const [programs, syntheses] = await Promise.all([
      supabase.from("training_program_drafts").select("id, title, program_date, day_mode, payload, created_by, created_at, updated_at").order("updated_at", { ascending: false }).limit(60),
      supabase.from("training_synthesis_drafts").select("id, title, synthesis_date, speakers, payload, created_by, created_at, updated_at").order("updated_at", { ascending: false }).limit(60),
    ]);
    programDrafts = (programs.data ?? []) as unknown as ProgramDraft[];
    synthesisDrafts = (syntheses.data ?? []) as unknown as SynthesisDraft[];
    programError = programs.error?.message ?? null;
    synthesisError = syntheses.error?.message ?? null;
  } else if (feedError) {
    programError = feedError.message;
    synthesisError = feedError.message;
  }

  return (
    <PreparationHub
      initialProgram={createEmptyProgram()}
      initialProgramDrafts={programDrafts}
      programDraftsUnavailable={programError ? "Les brouillons de programmes ne sont pas disponibles pour le moment." : null}
      initialSynthesis={createEmptySynthesis()}
      initialSynthesisDrafts={synthesisDrafts}
      synthesisDraftsUnavailable={synthesisError ? "Les brouillons de synthèses ne sont pas disponibles pour le moment." : null}
      creatorName={viewer?.fullName ?? ""}
    />
  );
}
