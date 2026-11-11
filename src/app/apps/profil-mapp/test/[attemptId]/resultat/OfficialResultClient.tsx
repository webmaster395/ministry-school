"use client";

import { ResultPanel } from "../../../MappNativeExperience";
import type { MappResultBundle } from "@/lib/mapp/types";

export function OfficialResultClient({ bundle }: { bundle: MappResultBundle }) {
  return <ResultPanel bundle={bundle} />;
}
