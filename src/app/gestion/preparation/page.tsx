import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";
import PreparationStudio from "@/components/preparation/PreparationStudio";
import { createEmptyProgram, type ProgramDraft } from "@/lib/preparation/program";

export default async function PreparationPage() {
  const viewer = await getViewer();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("training_program_drafts")
    .select("id, title, program_date, day_mode, payload, created_by, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(60);

  return (
    <PreparationStudio
      initialProgram={createEmptyProgram()}
      initialDrafts={(data ?? []) as unknown as ProgramDraft[]}
      draftsUnavailable={error ? "La table des brouillons n’est pas encore disponible. Appliquez la migration Supabase pour activer la sauvegarde." : null}
      creatorName={viewer?.fullName ?? ""}
    />
  );
}
