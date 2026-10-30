import { Check } from "lucide-react";

export default function ParticipationConditionsSummary({
  audience,
  audienceDetails,
  prerequisitesRequired,
  prerequisites,
}: {
  audience: "all" | "specific";
  audienceDetails?: string | null;
  prerequisitesRequired: boolean;
  prerequisites: string[];
}) {
  return <div className="mt-4 space-y-3">
    <p className="flex items-start gap-3 rounded-xl bg-surface px-4 py-3 text-[15px] leading-6"><Check size={17} className="mt-1 shrink-0" />{audience === "specific" ? `Réservé à : ${audienceDetails}` : "Ouvert à tous"}</p>
    {prerequisitesRequired && <div className="rounded-xl bg-surface px-4 py-3">
      <p className="flex items-center gap-2 text-[15px] font-semibold"><Check size={17} /> Prérequis nécessaires</p>
      <ul className="mt-2 space-y-1.5 pl-6 text-sm leading-6 text-muted">{prerequisites.map((item) => <li key={item} className="list-disc">{item}</li>)}</ul>
    </div>}
  </div>;
}
