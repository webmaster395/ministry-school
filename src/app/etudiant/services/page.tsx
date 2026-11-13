import Link from "next/link";
import { CalendarDays, ChevronRight, CircleUser, MapPin, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { plainTextContent } from "@/components/FormattedContent";
import {
  getMyRegistrationIds,
  getAllOpportunityDates,
  getOpportunities,
  getOpportunityDateCounts,
  isPublished,
  matchesKind,
  opportunityType,
  capacityPlacesLabel,
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

const href = (tab: Tab, filter: Filter, month: string, day?: string) => {
  const q = new URLSearchParams();
  if (tab !== "decouvrir") q.set("onglet", tab);
  if (filter !== "tout") q.set("type", filter);
  q.set("mois", month);
  if (day) q.set("jour", day);
  const s = q.toString();
  return `/etudiant/services${s ? `?${s}` : ""}`;
};

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string; type?: string; mois?: string; jour?: string }>;
}) {
  const { onglet, type, mois, jour } = await searchParams;
  const tab: Tab = onglet === "inscriptions" || onglet === "termines" ? onglet : "decouvrir";
  const filter: Filter = type === "projet" || type === "formation" ? type : "tout";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [all, mine, dates] = await Promise.all([
    getOpportunities(supabase),
    getMyRegistrationIds(supabase, user!.id),
    getAllOpportunityDates(supabase),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);
  const now = new Date(`${today}T12:00:00Z`);
  const endYear = now.getUTCMonth() + 1 <= 6 ? now.getUTCFullYear() : now.getUTCFullYear() + 1;
  const monthKeys: string[] = [];
  for (let cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)); cursor <= new Date(Date.UTC(endYear, 5, 1)); cursor.setUTCMonth(cursor.getUTCMonth() + 1)) {
    monthKeys.push(cursor.toISOString().slice(0, 7));
  }
  const selectedMonth = monthKeys.includes(mois ?? "") ? mois! : currentMonth;

  const published = all.filter((o) => isPublished(o));
  const countsByOpportunity = new Map(await Promise.all(published.map(async (opportunity) => [opportunity.id, await getOpportunityDateCounts(supabase, opportunity.id)] as const)));
  const datesByOpportunity = new Map<string, typeof dates>();
  for (const date of dates) datesByOpportunity.set(date.opportunity_id, [...(datesByOpportunity.get(date.opportunity_id) ?? []), date]);
  const hasUpcomingSession = (o: Opportunity) => (datesByOpportunity.get(o.id) ?? []).some((date) => date.session_date >= today);
  const inTab = (o: Opportunity) =>
    tab === "decouvrir"
      ? hasUpcomingSession(o) && !mine.has(o.id)
      : tab === "inscriptions"
        ? hasUpcomingSession(o) && mine.has(o.id)
        : !hasUpcomingSession(o);

  const tabbed = published.filter(inTab);
  const tabbedIds = new Set(tabbed.map((opportunity) => opportunity.id));
  const monthDates = dates.filter((date) => tabbedIds.has(date.opportunity_id) && date.session_date.startsWith(selectedMonth) && date.session_date >= today);
  const opportunityIdsForMonth = new Set(monthDates.map((date) => date.opportunity_id));
  const opportunityIdsForDay = jour && jour.startsWith(`${selectedMonth}-`) && /^\d{4}-\d{2}-\d{2}$/.test(jour)
    ? new Set(dates.filter((date) => date.session_date === jour).map((date) => date.opportunity_id))
    : null;
  const shown = tabbed.filter((o) => (filter === "tout" || matchesKind(o, filter)) && (tab === "termines" || opportunityIdsForMonth.has(o.id)) && (!opportunityIdsForDay || opportunityIdsForDay.has(o.id)));
  const monthOpportunities = tab === "termines" ? tabbed : tabbed.filter((opportunity) => opportunityIdsForMonth.has(opportunity.id));
  const nProjets = monthOpportunities.filter((o) => matchesKind(o, "projet")).length;
  const nFormations = monthOpportunities.filter((o) => matchesKind(o, "formation")).length;

  const filters: { key: Filter; label: string }[] = [
    { key: "tout", label: `Tout (${monthOpportunities.length})` },
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
            href={href(t.key, "tout", selectedMonth, jour)}
            className={`rounded-md py-3 text-center text-[15px] transition ${
              tab === t.key ? "bg-accent font-medium text-on-accent" : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab !== "termines" && <section aria-label="Choisir une période" className="rounded-2xl border border-border bg-background p-2 sm:p-3">
        <nav aria-label="Mois" className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {monthKeys.map((month) => {
            const count = new Set(dates.filter((date) => tabbedIds.has(date.opportunity_id) && date.session_date.startsWith(month) && date.session_date >= today).map((date) => date.opportunity_id)).size;
            return <Link key={month} href={href(tab, filter, month)} aria-current={selectedMonth === month ? "page" : undefined} className={`min-w-[92px] shrink-0 rounded-xl px-3 py-2.5 text-center transition ${selectedMonth === month ? "bg-accent text-on-accent" : "hover:bg-surface"}`}><strong className="block text-sm capitalize">{new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`))}</strong><span className={`mt-0.5 block text-[11px] ${selectedMonth === month ? "text-on-accent/75" : "text-muted"}`}>{count} activité{count > 1 ? "s" : ""}</span></Link>;
          })}
        </nav>
        {monthDates.length > 0 && <nav aria-label="Dates du mois" className="mt-2 flex gap-2 overflow-x-auto border-t border-border-soft pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link href={href(tab, filter, selectedMonth)} aria-current={!opportunityIdsForDay ? "page" : undefined} className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold ${!opportunityIdsForDay ? "bg-foreground text-background" : "bg-surface text-foreground"}`}>Tout le mois</Link>
          {[...new Set(monthDates.map((date) => date.session_date))].map((day) => {
            const count = new Set(monthDates.filter((date) => date.session_date === day).map((date) => date.opportunity_id)).size;
            return <Link key={day} href={href(tab, filter, selectedMonth, day)} aria-current={jour === day ? "page" : undefined} className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold ${jour === day ? "bg-foreground text-background" : "bg-surface text-foreground"}`}>{new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`))} · {count}</Link>;
          })}
        </nav>}
      </section>}

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={href(tab, f.key, selectedMonth, jour)}
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
            const sessions = (datesByOpportunity.get(o.id) ?? []).filter((date) => date.session_date.startsWith(selectedMonth) && date.session_date >= today);
            const session = opportunityIdsForDay ? sessions.find((date) => date.session_date === jour) ?? sessions[0] : sessions[0];
            const sessionTaken = session ? countsByOpportunity.get(o.id)?.get(session.id) ?? 0 : 0;
            const sessionCapacity = session?.capacity ?? o.capacity;
            const places = capacityPlacesLabel(sessionTaken, sessionCapacity);
            const remaining = sessionCapacity === null ? null : Math.max(0, sessionCapacity - sessionTaken);
            const fill = sessionCapacity === null ? 0 : Math.min(100, Math.round((sessionTaken / sessionCapacity) * 100));
            const organizer = o.organizer_label ?? o.services?.name;
            const type = opportunityType(o);
            const accent = type === "projet" ? "var(--f-projet)" : type === "formation" ? "var(--f-coeur)" : "var(--f-sensibilite)";
            const cardStatus = !session ? "termine" as const : !o.registration_open ? "a_venir" as const : sessionCapacity !== null && sessionTaken >= sessionCapacity ? "complet" as const : "disponible" as const;
            return (
              <li key={o.id}>
                <Link
                  href={`/etudiant/services/${o.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-background p-5 shadow-[0_10px_36px_rgba(24,34,30,.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_44px_rgba(24,34,30,.1)] sm:p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-2xl text-[18px]" style={{ background: `color-mix(in srgb, ${accent} 18%, white)` }}>{o.banner_emoji || (type === "formation" ? "✦" : "◆")}</span><span className="rounded-full px-3 py-1.5 text-[11px] font-semibold" style={{ color: accent, background: `color-mix(in srgb, ${accent} 13%, white)` }}>{TYPE_LABEL[type]}</span></div>
                    <span className="rounded-full bg-surface px-3 py-1.5 text-[11px] font-semibold text-foreground">
                      {mine.has(o.id) && cardStatus !== "termine" ? "Inscrit" : cardStatus === "complet" ? "Liste d’attente" : cardStatus === "disponible" ? "Inscriptions ouvertes" : STATUS_LABEL[cardStatus]}
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
                  {session ? <div className="mt-5 rounded-2xl p-4" style={{ background: `color-mix(in srgb, ${accent} 8%, var(--background))` }}>
                    <div className="flex items-start gap-3"><Users size={18} className="mt-0.5 shrink-0" /><div className="min-w-0"><span className="block text-[11px] font-semibold uppercase tracking-[.08em] text-muted">Prochaine session{session ? ` · ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${session.session_date}T12:00:00Z`))}` : ""}</span><strong className="mt-1 block text-[14px] text-foreground">{places.replace(" places ·", " inscrits ·")}</strong>{remaining === 0 && <span className="mt-1 block text-xs text-muted">La séance est complète, mais la liste d’attente est ouverte.</span>}</div></div>
                    {sessionCapacity !== null && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background/80"><span className="block h-full rounded-full" style={{ width: `${fill}%`, background: accent }} /></div>}
                  </div> : <div className="mt-5 rounded-2xl bg-surface p-4 text-sm font-semibold text-muted">Parcours terminé</div>}
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
