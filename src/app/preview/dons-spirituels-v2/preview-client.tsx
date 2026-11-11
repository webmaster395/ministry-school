"use client";

import { useState } from "react";
import SpiritualGiftsJourney from "@/components/apps/SpiritualGiftsJourney";

export default function SpiritualGiftsPreview() {
  const [initial, setInitial] = useState<Record<string, unknown>>({});
  return <SpiritualGiftsJourney initial={initial} saving={false} onBack={() => window.location.reload()} onSave={async (answers) => { setInitial(answers); }} />;
}
