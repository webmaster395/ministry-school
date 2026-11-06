"use client";

import { useState } from "react";
import { ResultPanel } from "../../../MappNativeExperience";
import type { MappResultBundle } from "@/lib/mapp/types";

export function OfficialResultClient({ bundle }: { bundle: MappResultBundle }) {
  const [current, setCurrent] = useState(bundle);
  return <ResultPanel bundle={current} onResolved={setCurrent} />;
}
