import type { ReactNode } from "react";
import { opportunityEmojis } from "@/lib/opportunity-banner";

type Variant = "hero" | "admin" | "preview" | "card";

const layout: Record<Variant, string> = {
  hero: "min-h-[230px] p-5 sm:min-h-[300px] sm:p-8 lg:p-9",
  admin: "min-h-44 p-5 sm:p-7",
  preview: "min-h-40 p-5 sm:p-6",
  card: "min-h-36 p-5",
};

const titleStyle: Record<Variant, string> = {
  hero: "max-w-4xl text-[clamp(1.85rem,5.8vw,3.2rem)] leading-[1.03]",
  admin: "max-w-4xl text-[30px] leading-tight sm:text-[36px]",
  preview: "max-w-3xl text-[25px] leading-tight sm:text-[30px]",
  card: "max-w-[85%] text-[24px] leading-tight",
};

export default function OpportunityBanner({
  emoji,
  title,
  typeLabel,
  meta,
  status,
  details,
  variant = "hero",
}: {
  emoji?: string | null;
  title: string;
  typeLabel: string;
  meta?: string;
  status?: string;
  details?: ReactNode;
  variant?: Variant;
}) {
  const compact = variant === "card";
  const emojis = opportunityEmojis(emoji);
  return (
    <div className={`relative isolate flex overflow-hidden bg-[#202927] text-white ${layout[variant]}`}>
      <span className="absolute inset-y-0 left-0 w-1.5 bg-[linear-gradient(180deg,#FFD45A,#F28A24)]" />
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#F4A12A]/[.06]" />
      <div className={`relative z-10 grid w-full gap-5 sm:gap-6 ${details && !compact ? "lg:grid-cols-[minmax(0,1.45fr)_minmax(270px,.55fr)] lg:items-end lg:gap-9" : ""}`}>
        <div className="flex min-w-0 flex-col justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="w-fit rounded-full bg-[linear-gradient(135deg,#F6B42C,#EE7D20)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-white shadow-sm sm:text-xs">
                {typeLabel}
              </span>
              {status && <span className="text-[11px] font-medium uppercase tracking-[.14em] text-white/55">{status}</span>}
            </div>
            <h1 className={`font-title mt-4 font-semibold tracking-[-.03em] text-white ${titleStyle[variant]}`}>{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex shrink-0 -space-x-3" aria-hidden="true">
              {emojis.map((item, index) => <span key={`${item}-${index}`} className={`${compact ? "h-11 w-11 text-[25px]" : "h-12 w-12 text-[28px] sm:h-14 sm:w-14 sm:text-[32px]"} grid place-items-center rounded-full border-[3px] border-[#202927] bg-white/12 leading-none ring-1 ring-white/15`} style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}>{item}</span>)}
            </span>
            {meta && !compact && <p className="text-sm font-medium text-white/75 sm:text-base">{meta}</p>}
          </div>
        </div>
        {details && !compact && (
          <div className="border-t border-white/15 pt-4 text-[13px] leading-relaxed text-white/80 sm:text-sm lg:border-l lg:border-t-0 lg:py-1 lg:pl-8">
            {details}
          </div>
        )}
      </div>
    </div>
  );
}
