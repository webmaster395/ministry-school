import Link from "next/link";
import { CalendarDays, ChevronRight, CircleUser, MapPin, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { plainTextContent } from "@/components/FormattedContent";
import {
  getMyRegistrationIds,
  getAllOpportunityDates,
  getOpportunities,
  getOpportunityCounts,
  isPublished,
  matchesKind,
  opportunityType,
  placesLabel,
  statusOf,
  STATUS_LABEL,
  TYPE_LABEL,
  type Opportunity,
} from "@/lib/data/opportunities";

type Tab = "decouvrir" | "inscriptions" | "termines";
type Filter = "tout" | "projet" | "formation";

const TABS: { key: Tab; label: string }[] = [
  { key: "decouvrir", label: "À découvrir" },
  { key: "inscriptions", label: "Mes inscriptions" },
  { key: "termines", label: "Terminés" },
];

const href = (tab: Tab, filter: Filter, day?: string) => {
  const q = new URLSearchParams();
  if (tab !== "decouvrir") q.set("onglet", tab);
  if (filter !== "tout") q.set("type", filter);
  if (day) q.set("jour", day);
  const s = q.toString();
  return `/etudiant/services${s ? `?${s}` : ""}`;
};

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string; type?: string; jour?: string }>;
}) {
  const { onglet, type, jour } = await searchParams;
  const tab: Tab = onglet === "inscriptions" || onglet === "termines" ? onglet : "decouvrir";
  const filter: Filter = type === "projet" || type === "formation" ? type : "tout";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [all, counts, mine, dates] = await Promise.all([
    getOpportunities(supabase),
    getOpportunityCounts(supabase),
    getMyRegistrationIds(supabase, user!.id),
    getAllOpportunityDates(supabase),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const taken = (o: Opportunity) => counts.get(o.id) ?? 0;
  const status = (o: Opportunity) => statusOf(o, taken(o), today);

  const published = all.filter((o) => isPublished(o));
  const inTab = (o: Opportunity) =>
    tab === "decouvrir"
      ? status(o) !== "termine" && !mine.has(o.id)
      : tab === "inscriptions"
        ? status(o) !== "termine" && mine.has(o.id)
        : status(o) === "termine" && mine.has(o.id);

  const tabbed = published.filter(inTab);
  const opportunityIdsForDay = jour && /^\d{4}-\d{2}-\d{2}$/.test(jour)
    ? new Set(dates.filter((date) => date.session_date === jour).map((date) => date.opportunity_id))
    : null;
  const shown = tabbed.filter((o) => (filter === "tout" || matchesKind(o, filter)) && (!opportunityIdsForDay || opportunityIdsForDay.has(o.id)));
  const nProjets = tabbed.filter((o) => matchesKind(o, "projet")).length;
  const nFormations = tabbed.filter((o) => matchesKind(o, "formation")).length;

  const filters: { key: Filter; label: string }[] = [
    { key: "tout", label: `Tout (${tabbed.length})` },
    { key: "projet", label: `Projets (${nProjets})` },
    { key: "formation", label: `Formations (${nFormations})` },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="font-title text-[26px] text-foreground">Projets et formations</h1><p className="mt-1 text-[14px] text-muted">{jour ? `Choisissez votre activité pour la journée du ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${jour}T12:00:00`))}.` : "Découvrez les propositions, comparez-les et inscrivez-vous simplement."}</p></div>
      </div>

      <nav className="tabbar grid auto-cols-fr grid-flow-col gap-1 rounded-lg border border-border bg-background p-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={href(t.key, "tout", jour)}
            className={`rounded-md py-3 text-center text-[15px] transition ${
              tab === t.key ? "bg-accent font-medium text-on-accent" : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={href(tab, f.key, jour)}
            className={`rounded-lg px-4 py-2.5 text-[15px] transition ${
              filter === f.key
                ? "bg-accent font-medium text-on-accent"
                : "border border-border bg-background text-muted hover:text-foreground"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {shown.length ? (
        <ul className="grid gap-4 lg:grid-cols-2">
          {shown.map((o) => {
            const places = placesLabel(o, taken(o));
            const remaining = o.capacity === null ? null : Math.max(0, o.capacity - taken(o));
            const fill = o.capacity === null ? 0 : Math.min(100, Math.round((taken(o) / o.capacity) * 100));
            const organizer = o.organizer_label ?? o.services?.name;
            const type = opportunityType(o);
            const accent = type === "projet" ? "var(--f-projet)" : type === "formation" ? "var(--f-coeur)" : "var(--f-sensibilite)";
            return (
              <li key={o.id}>
                <Link
                  href={`/etudiant/services/${o.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-background p-5 shadow-[0_10px_36px_rgba(24,34,30,.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_44px_rgba(24,34,30,.1)] sm:p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-2xl text-[18px]" style={{ background: `color-mix(in srgb, ${accent} 18%, white)` }}>{o.banner_emoji || (type === "formation" ? "✦" : "◆")}</span><span className="rounded-full px-3 py-1.5 text-[11px] font-semibold" style={{ color: accent, background: `color-mix(in srgb, ${accent} 13%, white)` }}>{TYPE_LABEL[type]}</span></div>
                    <span className="rounded-full bg-surface px-3 py-1.5 text-[11px] font-semibold text-foreground">
                      {mine.has(o.id) && status(o) !== "termine" ? "Inscrit" : status(o) === "complet" ? "Liste d’attente" : status(o) === "disponible" ? "Inscriptions ouvertes" : STATUS_LABEL[status(o)]}
                    </span>
                  </div>
                  <h2 className="mt-5 text-[20px] font-semibold leading-tight text-foreground">{o.title}</h2>
                  <p className="mt-2 line-clamp-3 text-[14px] leading-6 text-muted">
                    {plainTextContent(o.short_description || o.description)}
                  </p>
                  <ul className="mt-5 grid gap-2 text-[13px] text-muted sm:grid-cols-2">
                    {organizer && (
                      <li className="flex items-center gap-2.5">
                        <CircleUser size={17} strokeWidth={1.6} /> {organizer}
                      </li>
                    )}
                    {o.schedule_label && (
                      <li className="flex items-center gap-2.5">
                        <CalendarDays size={17} strokeWidth={1.6} /> {o.schedule_label}
                      </li>
                    )}
                    {o.location && <li className="flex items-center gap-2.5"><MapPin size={16} />{o.location}</li>}
                  </ul>
                  <div className="mt-5 rounded-2xl p-4" style={{ background: `color-mix(in srgb, ${accent} 8%, var(--background))` }}>
                    <div className="flex items-start gap-3"><Users size={18} className="mt-0.5 shrink-0" /><div className="min-w-0"><strong className="block text-[14px] text-foreground">{places}</strong>{remaining === 0 && <span className="mt-1 block text-xs text-muted">La séance est complète, mais la liste d’attente est ouverte.</span>}</div></div>
                    {o.capacity !== null && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background/80"><span className="block h-full rounded-full" style={{ width: `${fill}%`, background: accent }} /></div>}
                  </div>
                  <span className="mt-5 inline-flex items-center justify-between gap-2 border-t border-border-soft pt-4 text-[13px] font-semibold text-foreground">Voir le détail et choisir <ChevronRight size={17} className="transition group-hover:translate-x-1" /></span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <section className="rounded-lg border border-border bg-background p-6">
          <p className="text-[15px] text-muted">
            {tab === "decouvrir"
              ? "Aucun projet ou formation validé n’est disponible pour le moment."
              : tab === "inscriptions"
                ? "Vous n'êtes inscrit à rien pour l'instant."
                : "Aucune formation ou projet terminé."}
          </p>
        </section>
      )}
    </div>
  );
}
