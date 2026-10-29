"use client";

import { Check, GraduationCap, HandHeart, Landmark } from "lucide-react";
import { useMemo, useState } from "react";
import {
  STRATEGIC_AXES,
  strategicNarrativeOf,
  type StrategicAxis,
} from "@/lib/opportunity-strategy";

const AXES: StrategicAxis[] = ["former", "auberge", "fundraising"];
const ICONS = {
  former: GraduationCap,
  auberge: HandHeart,
  fundraising: Landmark,
};

type Initial = {
  axes?: StrategicAxis[] | null;
  former?: string | null;
  auberge?: string | null;
  fundraising?: string | null;
  connection?: string | null;
};

export default function StrategicAxesFields({
  initial,
  title,
  type,
  objectives,
  description,
}: {
  initial?: Initial;
  title: string;
  type: "projet" | "formation" | "both";
  objectives?: string | null;
  description?: string | null;
}) {
  const [selected, setSelected] = useState<StrategicAxis[]>(initial?.axes ?? []);
  const [contributions, setContributions] = useState<Record<StrategicAxis, string>>({
    former: initial?.former ?? "",
    auberge: initial?.auberge ?? "",
    fundraising: initial?.fundraising ?? "",
  });
  const [connection, setConnection] = useState(initial?.connection ?? "");
  const narrative = useMemo(() => strategicNarrativeOf({
    title: title || "Cette initiative",
    is_project: type === "projet" || type === "both",
    is_training: type === "formation" || type === "both",
    objectives,
    description,
    strategic_axes: selected,
    strategic_contribution_former: contributions.former,
    strategic_contribution_auberge: contributions.auberge,
    strategic_contribution_fundraising: contributions.fundraising,
    strategic_axes_connection: connection,
  }), [connection, contributions, description, objectives, selected, title, type]);

  function toggle(axis: StrategicAxis) {
    setSelected((current) => current.includes(axis)
      ? current.filter((item) => item !== axis)
      : [...current, axis]);
  }

  return <section className="sm:col-span-2 lg:col-span-2 rounded-3xl border border-[#E7B64F]/45 bg-[#FFF9EA] p-4 sm:p-6">
    <div className="max-w-3xl">
      <p className="label text-[11px] tracking-[.15em] text-[#86610F]">VISION MLK 2026-2027</p>
      <h2 className="font-title mt-1 text-[22px] text-foreground">À quelles priorités cette initiative contribue-t-elle ?</h2>
      <p className="mt-2 text-sm leading-6 text-muted">Sélectionnez au moins un axe. Pour chaque axe choisi, décrivez uniquement la contribution réelle de l’initiative : le texte étudiant sera construit à partir de ces réponses.</p>
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

    {selected.length === 0 && <p className="mt-3 text-xs font-medium text-[#8A5E08]">Choisissez au moins un axe avant d’enregistrer ou de demander la publication.</p>}

    <div className="mt-5 space-y-4">
      {AXES.filter((axis) => selected.includes(axis)).map((axis) => {
        const item = STRATEGIC_AXES[axis];
        return <label key={axis} className="block rounded-2xl bg-white p-4">
          <span className="text-sm font-semibold text-foreground">Contribution à « {item.shortLabel} »</span>
          <span className="mt-1 block text-xs leading-5 text-muted">{item.prompt}</span>
          <textarea name={`strategic_contribution_${axis}`} required rows={4} value={contributions[axis]} onChange={(event) => setContributions((current) => ({ ...current, [axis]: event.target.value }))} className="mt-3 w-full resize-y rounded-xl border border-border bg-background p-3 text-sm leading-6 outline-none focus:border-[#D99A21]" placeholder="Décrivez des personnes, besoins, apprentissages, actions ou ressources réellement prévus…" />
        </label>;
      })}
      {selected.length >= 2 && <label className="block rounded-2xl bg-white p-4"><span className="text-sm font-semibold text-foreground">Lien concret entre les axes</span><span className="mt-1 block text-xs leading-5 text-muted">Expliquez comment ces contributions se complètent dans cette initiative. Si elles correspondent à des actions distinctes, dites-le simplement sans inventer de lien.</span><textarea name="strategic_axes_connection" required rows={4} value={connection} onChange={(event) => setConnection(event.target.value)} className="mt-3 w-full resize-y rounded-xl border border-border bg-background p-3 text-sm leading-6 outline-none focus:border-[#D99A21]" /></label>}
    </div>

    {narrative.length > 0 && <details className="mt-5 rounded-2xl border border-[#E7D7B4] bg-white p-4"><summary className="cursor-pointer text-sm font-semibold text-foreground">Aperçu du texte étudiant</summary><div className="mt-4 max-w-[70ch] space-y-3 text-sm leading-6 text-muted">{narrative.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></details>}
  </section>;
}
