import Link from "next/link";
import { CalendarDays, ChevronRight, CircleUser, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import OpportunityBanner from "@/components/OpportunityBanner";
import { plainTextContent } from "@/components/FormattedContent";
import {
  getMyRegistrationIds,
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

const href = (tab: Tab, filter: Filter) => {
  const q = new URLSearchParams();
  if (tab !== "decouvrir") q.set("onglet", tab);
  if (filter !== "tout") q.set("type", filter);
  const s = q.toString();
  return `/etudiant/services${s ? `?${s}` : ""}`;
};

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string; type?: string }>;
}) {
  const { onglet, type } = await searchParams;
  const tab: Tab = onglet === "inscriptions" || onglet === "termines" ? onglet : "decouvrir";
  const filter: Filter = type === "projet" || type === "formation" ? type : "tout";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [all, counts, mine] = await Promise.all([
    getOpportunities(supabase),
    getOpportunityCounts(supabase),
    getMyRegistrationIds(supabase, user!.id),
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
  const shown = tabbed.filter((o) => filter === "tout" || matchesKind(o, filter));
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
        <p className="text-[15px] text-muted">Choisissez comment mettre vos compétences en pratique.</p>
      </div>

      <nav className="tabbar grid auto-cols-fr grid-flow-col gap-1 rounded-lg border border-border bg-background p-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={href(t.key, "tout")}
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
            href={href(tab, f.key)}
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
        <ul className="grid gap-[22px] lg:grid-cols-2">
          {shown.map((o) => {
            const places = placesLabel(o, taken(o));
            const organizer = o.organizer_label ?? o.services?.name;
            return (
              <li key={o.id}>
                <Link
                  href={`/etudiant/services/${o.id}`}
                  className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background transition hover:border-foreground hover:shadow-sm"
                >
                  <OpportunityBanner emoji={o.banner_emoji} title={o.title} typeLabel={TYPE_LABEL[opportunityType(o)]} variant="card" />
                  <div className="flex flex-1 flex-col p-6">
                    <span className="text-[13px] text-muted">
                      {mine.has(o.id) && status(o) !== "termine" ? "Inscrit" : STATUS_LABEL[status(o)]}
                    </span>
                  <p className="mt-2 line-clamp-2 text-[15px] leading-relaxed text-muted">
                    {plainTextContent(o.short_description || o.description)}
                  </p>

                  <ul className="mt-auto space-y-2 pt-5 text-[15px] text-muted">
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
                    {o.location && <li className="flex items-center gap-2.5">{o.location}</li>}
                    <li className="flex items-center justify-between gap-2.5">
                      <span className="flex items-center gap-2.5">
                        {places && (
                          <>
                            <Users size={17} strokeWidth={1.6} /> {places}
                          </>
                        )}
                      </span>
                      <ChevronRight size={16} />
                    </li>
                  </ul>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <section className="rounded-lg border border-border bg-background p-6">
          <p className="text-[15px] text-muted">
            {tab === "decouvrir"
              ? "Aucune proposition pour le moment. Les formations des services et les projets apparaîtront ici."
              : tab === "inscriptions"
                ? "Vous n'êtes inscrit à rien pour l'instant."
                : "Aucune formation ou projet terminé."}
          </p>
        </section>
      )}
    </div>
  );
}
