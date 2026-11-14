import { BarChart3, CheckCircle2, Heart, Sparkles, UsersRound } from "lucide-react";
import type { GraceIdentitySummary } from "@/lib/apps/grace-identity-results";
import { StudioCard } from "@/components/apps-studio/AppsStudioShell";
import type { GraceTestKey } from "@/lib/apps/grace-identity";

function dateTime(value: string | null) {
  if (!value) return "Aucune réponse pour le moment";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(value));
}

export default function GraceIdentityResults({ summary, focus }: { summary: GraceIdentitySummary; focus?: GraceTestKey }) {
  const hasData = summary.completed.fruit + summary.completed.gifts + summary.completed.skills > 0;
  return <div className="space-y-6">
    <div className={`grid gap-3 ${focus ? "max-w-sm" : "sm:grid-cols-3"}`}>
      {(!focus || focus === "fruit") && <Metric icon={<Heart size={18} />} label="Fruit de l’Esprit" value={summary.completed.fruit} />}
      {(!focus || focus === "gifts") && <Metric icon={<Sparkles size={18} />} label="Dons spirituels" value={summary.completed.gifts} />}
      {(!focus || focus === "skills") && <Metric icon={<UsersRound size={18} />} label="Compétences naturelles" value={summary.completed.skills} />}
    </div>
    <p className="text-xs text-muted">Dernière mise à jour : {dateTime(summary.latestUpdate)}. Les résultats ci-dessous sont agrégés : aucune réponse personnelle n’est affichée.</p>
    {!hasData ? <StudioCard><div className="py-8 text-center"><BarChart3 className="mx-auto text-muted" size={28} /><h2 className="mt-4 font-title text-2xl font-normal">Aucun résultat pour le moment</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">Les statistiques apparaîtront ici dès que des étudiants auront enregistré une autoévaluation.</p></div></StudioCard> : <>
      {(!focus || focus === "fruit") && <StudioCard><SectionTitle title="Le fruit de l’Esprit" description="Moyenne déclarée sur 5, à partir des autoévaluations enregistrées." /><div className="mt-6 grid gap-4 md:grid-cols-2">{summary.fruitAverages.map((item, index) => <div key={item.name} className="rounded-2xl border border-border-soft bg-surface p-4"><div className="flex items-baseline justify-between gap-3"><strong className="font-title text-xl font-normal">{item.name}</strong><span className="font-title text-2xl">{item.count ? item.value.toFixed(1).replace(".", ",") : "—"}<small className="ml-1 text-xs font-sans text-muted">/5</small></span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-background"><span className={`block h-full rounded-full ${["bg-[#d8ec6a]", "bg-[#ffbd62]", "bg-[#efb1b1]", "bg-[#b6d4d1]", "bg-[#d7c9f1]"][index % 5]}`} style={{ width: `${item.value / 5 * 100}%` }} /></div><p className="mt-2 text-[11px] text-muted">{item.count} réponse{item.count > 1 ? "s" : ""} prise{item.count > 1 ? "s" : ""} en compte</p></div>)}</div></StudioCard>}
      {(!focus || focus === "gifts") && <StudioCard><SectionTitle title="Dons spirituels" description="Nombre de personnes qui reconnaissent ce don ou souhaitent l’explorer." /><div className="mt-6 grid gap-3 md:grid-cols-2">{summary.giftResponses.map((item) => <div key={item.name} className="rounded-2xl border border-border-soft p-4"><strong className="text-sm font-medium">{item.name}</strong><div className="mt-3 flex flex-wrap gap-2 text-xs"><Badge label="Oui" value={item.yes} tone="green" /><Badge label="À explorer" value={item.explore} tone="gold" /><Badge label="Non" value={item.no} tone="muted" /></div></div>)}</div></StudioCard>}
      {(!focus || focus === "skills") && <div className="grid gap-6 lg:grid-cols-2"><StudioCard><SectionTitle title="Compétences les plus reconnues" description="Sélections personnelles, sans classement des étudiants." />{summary.skills.length ? <ol className="mt-5 space-y-3">{summary.skills.map((item, index) => <li key={item.name} className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-surface text-xs text-muted">{index + 1}</span><span className="min-w-0 flex-1 text-sm">{item.name}</span><strong className="text-sm font-medium">{item.count}</strong></li>)}</ol> : <p className="mt-5 text-sm text-muted">Aucune compétence enregistrée.</p>}</StudioCard><StudioCard><SectionTitle title="Regards externes" description="Liens d’évaluation générés par les étudiants." /><div className="mt-6 grid grid-cols-2 gap-4"><Metric icon={<UsersRound size={17} />} label="Liens créés" value={summary.externalReviews.created} compact /><Metric icon={<CheckCircle2 size={17} />} label="Évaluations reçues" value={summary.externalReviews.completed} compact /></div></StudioCard></div>}
    </>}
  </div>;
}

function Metric({ icon, label, value, compact = false }: { icon: React.ReactNode; label: string; value: number; compact?: boolean }) { return <StudioCard className={compact ? "p-4 sm:p-4" : "p-4 sm:p-5"}><div className="flex items-center gap-2 text-muted">{icon}<span className="text-xs">{label}</span></div><strong className="mt-3 block font-title text-4xl font-normal">{value}</strong></StudioCard>; }
function SectionTitle({ title, description }: { title: string; description: string }) { return <header><h2 className="font-title text-2xl font-normal">{title}</h2><p className="mt-1 text-sm leading-6 text-muted">{description}</p></header>; }
function Badge({ label, value, tone }: { label: string; value: number; tone: "green" | "gold" | "muted" }) { const color = tone === "green" ? "bg-[#dceee5] text-[#28634f]" : tone === "gold" ? "bg-[#fff0d5] text-[#8a642c]" : "bg-surface text-muted"; return <span className={`rounded-full px-2.5 py-1 ${color}`}>{label} · {value}</span>; }
