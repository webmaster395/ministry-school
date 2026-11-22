"use client";

import SynthesisStudio from "@/components/preparation/SynthesisStudio";
import { createEmptySynthesis } from "@/lib/preparation/synthesis";

export default function EditablePdfProofPageClient() {
  return <SynthesisStudio
    initialSynthesis={createEmptySynthesis("2026-11-07")}
    initialDrafts={[]}
    draftsUnavailable={null}
    creatorName="Prévisualisation"
    onModeChange={() => undefined}
  />;
}
