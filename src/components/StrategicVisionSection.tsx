import { Compass } from "lucide-react";
import {
  STRATEGIC_AXES,
  strategicNarrativeOf,
  type StrategicOpportunity,
} from "@/lib/opportunity-strategy";

export default function StrategicVisionSection({
  opportunity,
  showIncomplete = false,
}: {
  opportunity: StrategicOpportunity;
  showIncomplete?: boolean;
}) {
  const narrative = strategicNarrativeOf(opportunity);
  const axes = opportunity.strategic_axes ?? [];
  if (!narrative.length && !showIncomplete) return null;

  return <section className="overflow-hidden rounded-3xl border border-[#E7B64F]/45 bg-[#FFF9EA]">
    <div className="border-b border-[#E7B64F]/30 px-5 py-5 sm:px-7">
      <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F4A12A] text-white"><Compass size={20} /></span><div><p className="label text-[10px] tracking-[.16em] text-[#86610F]">VISION MLK 2026-2027</p><h2 className="font-title mt-1 text-[24px] text-foreground">Une initiative au service de notre vision</h2></div></div>
      {axes.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{axes.map((axis) => STRATEGIC_AXES[axis] && <span key={axis} className="rounded-full border border-[#E7B64F]/45 bg-white px-3 py-1.5 text-xs font-semibold text-[#72500B]">{STRATEGIC_AXES[axis].shortLabel}</span>)}</div>}
    </div>
    {narrative.length ? <div className="max-w-[74ch] space-y-4 px-5 py-6 text-[16px] leading-7 text-foreground sm:px-7">{narrative.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div> : <div className="px-5 py-5 text-sm leading-6 text-[#72500B] sm:px-7"><strong className="block">Contribution stratégique à compléter</strong>Choisissez au moins un axe et décrivez sa contribution concrète avant de demander la publication. Aucun texte ne sera inventé automatiquement.</div>}
  </section>;
}
