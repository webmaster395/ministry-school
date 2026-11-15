"use client";

import { ResultPanel } from "../../../MappNativeExperience";
import { useState } from "react";
import type { MappResultBundle } from "@/lib/mapp/types";

export function OfficialResultClient({ bundle, canInvite }: { bundle: MappResultBundle; canInvite: boolean }) {
  const [current, setCurrent] = useState(bundle);
  return <ResultPanel bundle={current} onBundleChange={setCurrent} canInvite={canInvite} />;
}
