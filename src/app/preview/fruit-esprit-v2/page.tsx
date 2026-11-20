"use client";

import FruitSpiritJourney from "@/components/apps/FruitSpiritJourney";
import { fruitSpiritQuestionIdsV2 } from "@/lib/apps/fruit-spirit-v2";

const completedPreview = Object.fromEntries(fruitSpiritQuestionIdsV2.map((questionId, index) => [questionId, index % 3 === 0 ? 5 : 4]));

export default function FruitEspritPreview() {
  return <FruitSpiritJourney
    initial={completedPreview}
    saving={false}
    onBack={() => undefined}
    onSave={async () => undefined}
  />;
}
