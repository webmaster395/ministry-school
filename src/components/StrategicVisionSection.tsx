import { Compass } from "lucide-react";
import {
  MLK_STRATEGIC_VISION,
  STRATEGIC_AXES,
  strategicAxesOf,
  strategicNarrativeOf,
  type StrategicOpportunity,
} from "@/lib/opportunity-strategy";

export default function StrategicVisionSection({ opportunity, showIncomplete = false }: {
  opportunity: StrategicOpportunity;
  showIncomplete?: boolean;
}) {
  const axes = strategicAxesOf(opportunity);
  if (!axes.length && !showIncomplete) return null;
  const paragraphs = strategicNarrativeOf(opportunity);

  return <section className="relative overflow-hidden rounded-3xl border border-[#E7B64F]/45 bg-gradient-to-br from-[#FFF9EA] via-[#FFFDF7] to-[#FFF4D8] px-5 py-6 sm:px-7 sm:py-7">
    <span aria-hidden className="absolute -right-14 -top-14 h-40 w-40 rounded-full border-[26px] border-[#F4A12A]/[.07]" />
    <div className="relative">
      <header className="flex items-start gap-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F4A12A] text-white shadow-sm"><Compass size={20} /></span>
        <div className="min-w-0">
          <p className="label text-[10px] tracking-[.16em] text-[#86610F]">{MLK_STRATEGIC_VISION.section.eyebrow}</p>
          <h2 className="font-title mt-1 text-[22px] leading-tight text-foreground sm:text-[24px]">{MLK_STRATEGIC_VISION.section.title}</h2>
        </div>
      </header>

      {paragraphs.length > 0 ? <>
        <div className="mt-5 max-w-[78ch] space-y-3 text-[15px] leading-7 text-foreground sm:text-[16px]">
          {paragraphs.map((paragraph, index) => <p key={paragraph} className={index === 0 ? "font-medium" : "text-foreground/85"}>{paragraph}</p>)}
        </div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-[#E7B64F]/30 pt-4" aria-label="Axes stratégiques sélectionnés">
          {axes.map((axis) => <span key={axis} className="rounded-full border border-[#E7B64F]/45 bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#72500B] shadow-[0_1px_0_rgba(114,80,11,.04)]">{STRATEGIC_AXES[axis].shortLabel}</span>)}
        </div>
      </> : <p className="mt-5 text-sm text-[#72500B]">Sélectionnez au moins un axe stratégique avant la publication.</p>}
    </div>
  </section>;
}
