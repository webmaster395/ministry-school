"use client";

import { useState } from "react";
import type { ProgramDraft, TrainingProgram } from "@/lib/preparation/program";
import type { SynthesisDraft, TrainingSynthesis } from "@/lib/preparation/synthesis";
import PreparationStudio from "./PreparationStudio";
import SynthesisStudio from "./SynthesisStudio";
import type { PreparationMode } from "./PreparationModeTabs";

export default function PreparationHub({
  initialProgram,
  initialProgramDrafts,
  programDraftsUnavailable,
  initialSynthesis,
  initialSynthesisDrafts,
  synthesisDraftsUnavailable,
  creatorName,
}: {
  initialProgram: TrainingProgram;
  initialProgramDrafts: ProgramDraft[];
  programDraftsUnavailable: string | null;
  initialSynthesis: TrainingSynthesis;
  initialSynthesisDrafts: SynthesisDraft[];
  synthesisDraftsUnavailable: string | null;
  creatorName: string;
}) {
  const [mode, setMode] = useState<PreparationMode>("program");
  return mode === "program"
    ? <PreparationStudio initialProgram={initialProgram} initialDrafts={initialProgramDrafts} draftsUnavailable={programDraftsUnavailable} creatorName={creatorName} onModeChange={setMode} />
    : <SynthesisStudio initialSynthesis={initialSynthesis} initialDrafts={initialSynthesisDrafts} draftsUnavailable={synthesisDraftsUnavailable} creatorName={creatorName} onModeChange={setMode} />;
}
