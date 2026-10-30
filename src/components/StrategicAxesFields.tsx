"use client";

import { Check, GraduationCap, HandHeart, Landmark } from "lucide-react";
import { useState } from "react";
import { STRATEGIC_AXES, type StrategicAxis } from "@/lib/opportunity-strategy";

const AXES: StrategicAxis[] = ["former", "auberge", "fundraising"];
const ICONS = { former: GraduationCap, auberge: HandHeart, fundraising: Landmark };

export default function StrategicAxesFields({ initial }: {
  initial?: { axes?: StrategicAxis[] | null };
  title: string;
  type: "projet" | "formation" | "both";
  objectives?: string | null;
  description?: string | null;
}) {
  const [selected, setSelected] = useState<StrategicAxis[]>(initial?.axes ?? []);
  const toggle = (axis: StrategicAxis) => setSelected((current) => current.includes(axis)
    ? current.filter((item) => item !== axis)
    : [...current, axis]);

  return <section className="sm:col-span-2 lg:col-span-2 rounded-3xl border border-[#E7B64F]/45 bg-[#FFF9EA] p-4 sm:p-6">
    <div className="max-w-3xl">
      <p className="label text-[11px] tracking-[.15em] text-[#86610F]">VISION MLK 2026-2027</p>
      <h2 className="font-title mt-1 text-[22px] text-foreground">Axes stratégiques</h2>
      <p className="mt-2 text-sm leading-6 text-muted">Sélectionnez un ou plusieurs axes auxquels ce projet ou cette formation se rattache. Aucun texte complémentaire n’est demandé.</p>
    </div>
    <div className="mt-5 grid gap-3 lg:grid-cols-3">
      {AXES.map((axis) => {
        const item = STRATEGIC_AXES[axis];
        const Icon = ICONS[axis];
        const active = selected.includes(axis);
        return <label key={axis} className={`relative cursor-pointer rounded-2xl border p-4 transition ${active ? "border-[#D99A21] bg-white shadow-sm" : "border-[#E7D7B4] bg-white/55 hover:border-[#D99A21]"}`}>
          <input type="checkbox" name="strategic_axes" value={axis} checked={active} onChange={() => toggle(axis)} className="sr-only" />
          <span className="flex items-start gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${active ? "bg-[#F4A12A] text-white" : "bg-[#FFF0CC] text-[#7A560B]"}`}><Icon size={19} /></span><span><strong className="block text-sm text-foreground">{item.label}</strong><small className="mt-1 block text-xs leading-5 text-muted">{item.description}</small></span></span>
          {active && <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-foreground text-white"><Check size={12} /></span>}
        </label>;
      })}
    </div>
    {selected.length === 0 && <p className="mt-3 text-xs font-medium text-[#8A5E08]">Choisissez au moins un axe avant d’enregistrer.</p>}
  </section>;
}
