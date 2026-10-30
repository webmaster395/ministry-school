import { Compass } from "lucide-react";
import { STRATEGIC_AXES, type StrategicOpportunity } from "@/lib/opportunity-strategy";

function joinLabels(labels: string[]) {
  if (labels.length < 2) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} et ${labels.at(-1)}`;
}

export default function StrategicVisionSection({ opportunity, showIncomplete = false }: {
  opportunity: StrategicOpportunity;
  showIncomplete?: boolean;
}) {
  const axes = [...new Set(opportunity.strategic_axes ?? [])].filter((axis) => STRATEGIC_AXES[axis]);
  if (!axes.length && !showIncomplete) return null;
  const initiative = opportunity.is_project && opportunity.is_training
    ? "Ce projet et cette formation"
    : opportunity.is_training ? "Cette formation" : "Ce projet";
  const labels = axes.map((axis) => STRATEGIC_AXES[axis].shortLabel);

  return <section className="overflow-hidden rounded-3xl border border-[#E7B64F]/45 bg-[#FFF9EA] px-5 py-5 sm:px-7">
    <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F4A12A] text-white"><Compass size={20} /></span><div><p className="label text-[10px] tracking-[.16em] text-[#86610F]">VISION MLK 2026-2027</p><h2 className="font-title mt-1 text-[22px] text-foreground">Axes stratégiques de l’Église MLK</h2></div></div>
    {axes.length ? <><p className="mt-4 max-w-[72ch] text-[16px] leading-7 text-foreground">{initiative} s’inscrit dans {axes.length === 1 ? "l’un des axes stratégiques" : "plusieurs axes stratégiques"} 2026-2027 de l’Église MLK : <strong>{joinLabels(labels)}</strong>.</p><div className="mt-4 flex flex-wrap gap-2">{axes.map((axis) => <span key={axis} className="rounded-full border border-[#E7B64F]/45 bg-white px-3 py-1.5 text-xs font-semibold text-[#72500B]">{STRATEGIC_AXES[axis].shortLabel}</span>)}</div></> : <p className="mt-4 text-sm text-[#72500B]">Sélectionnez au moins un axe stratégique avant la publication.</p>}
  </section>;
}
