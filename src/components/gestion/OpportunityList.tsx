import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOpportunities, getOpportunityCounts, getProposalRights, type OpportunityKind } from "@/lib/data/opportunities";
import { formatSessionDate } from "@/lib/format";

type DateRow = { opportunity_id: string; session_date: string; start_time: string; end_time: string; room: string | null };

const TABS = [
  { key: "prochaine", label: "Prochaine session" },
  { key: "plus-tard", label: "Plus tard" },
  { key: "brouillons", label: "En attente / Brouillons" },
  { key: "termines", label: "Terminés" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const hm = (t: string) => t.slice(0, 5).replace(":", " h ").replace(/ h 00$/, " h");
const longDate = (d: string) => `${formatSessionDate(d).split(" ").slice(1).join(" ")} ${d.slice(0, 4)}`;

const COPY: Record<OpportunityKind, { slug: string; propose: string; empty: string }> = {
  projet: { slug: "projets", propose: "Proposer un projet", empty: "Aucun projet dans cette liste." },
  formation: { slug: "services", propose: "Proposer une formation", empty: "Aucune formation dans cette liste." },
};

/**
 * La liste des formations d'un service ou des projets d'un chef de projet, dans son espace de gestion :
 * quatre onglets (prochaine session, plus tard, brouillons, terminés), l'état des inscriptions et les
 * boutons « Gérer » et « Inscrits ». Un administrateur voit celles de tout le monde.
 */
export default async function OpportunityList({ kind, tab: requested }: { kind: OpportunityKind; tab?: string }) {
  const copy = COPY[kind];
  const tab: TabKey = TABS.some((t) => t.key === requested) ? (requested as TabKey) : "prochaine";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [all, counts, { data: me }, rights] = await Promise.all([
    getOpportunities(supabase),
    getOpportunityCounts(supabase),
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    getProposalRights(supabase, user!.id),
  ]);
  const isAdmin = me?.role === "admin";
  const mine = all.filter((o) => o.kind === kind && (isAdmin || o.created_by === user!.id || o.lead_id === user!.id));

  const { data: dateRows } = mine.length
    ? await supabase
        .from("opportunity_dates")
        .select("opportunity_id, session_date, start_time, end_time, room")
        .in("opportunity_id", mine.map((o) => o.id))
        .order("session_date")
    : { data: [] as DateRow[] };
  const datesOf = new Map<string, DateRow[]>();
  for (const d of (dateRows ?? []) as DateRow[]) datesOf.set(d.opportunity_id, [...(datesOf.get(d.opportunity_id) ?? []), d]);

  const today = new Date().toISOString().slice(0, 10);
  const rows = mine.map((o) => {
    const dates = datesOf.get(o.id) ?? [];
    const upcoming = dates.find((d) => d.session_date >= today);
    const ended = o.ends_on ? o.ends_on < today : dates.length > 0 && !upcoming;
    return { o, dates, next: upcoming ?? dates[dates.length - 1] ?? null, ended, taken: counts.get(o.id) ?? 0 };
  });

  const active = rows.filter((r) => !r.ended && r.o.registration_open);
  const soonest = active.map((r) => r.next?.session_date).filter(Boolean).sort()[0];
  const shown = rows.filter((r) => {
    if (tab === "termines") return r.ended;
    if (tab === "brouillons") return !r.ended && !r.o.registration_open;
    if (r.ended || !r.o.registration_open) return false;
    const sooner = !soonest || !r.next || r.next.session_date <= soonest;
    return tab === "prochaine" ? sooner : !sooner;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <nav className="grid min-w-0 basis-full grid-cols-2 sm:basis-0 sm:flex-1 gap-1 rounded-lg border border-border bg-background p-1 sm:grid-cols-4">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={t.key === "prochaine" ? `/gestion/${copy.slug}` : `/gestion/${copy.slug}?onglet=${t.key}`}
              aria-current={tab === t.key ? "page" : undefined}
              className={`rounded-md py-3 text-center text-[15px] transition ${
                tab === t.key ? "bg-accent font-medium text-on-accent" : "text-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        {rights[kind] && (
          <Link
            href={`/gestion/${copy.slug}/nouveau`}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-[15px] font-medium text-on-accent transition hover:bg-[#1b2221]"
          >
            <Plus size={16} strokeWidth={2} /> {copy.propose}
          </Link>
        )}
      </div>

      {shown.length ? (
        <ul className="space-y-3">
          {shown.map(({ o, dates, next, taken }) => {
            const incomplete = dates.length === 0 || !o.description.trim();
            const organizer = o.organizer_label ?? o.services?.name;
            const place = [next?.room, organizer].filter(Boolean).join(" · ");
            return (
              <li
                key={o.id}
                className="grid items-center gap-4 rounded-2xl border border-border bg-background p-5 sm:grid-cols-[1fr_auto_200px] sm:gap-8 sm:p-6"
              >
                <div className="min-w-0">
                  <h3 className="font-title text-[20px] leading-tight text-foreground">{o.title}</h3>
                  <p className="mt-1 text-[15px] text-muted">
                    {next ? `${longDate(next.session_date)} · ${hm(next.start_time)}–${hm(next.end_time)}` : "Date à définir"}
                  </p>
                  {place && <p className="mt-0.5 text-[13px] text-muted">{place}</p>}
                </div>
                <div className="space-y-2">
                  <p className="text-[15px] font-semibold text-foreground">
                    {o.capacity !== null ? `${taken} inscrits sur ${o.capacity}` : `${taken} inscrit${taken > 1 ? "s" : ""}`}
                  </p>
                  {!o.registration_open ? (
                    <span className="inline-block rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] font-medium text-foreground">
                      En attente de validation
                    </span>
                  ) : incomplete ? (
                    <span className="inline-block rounded-full bg-m-doctoral/10 px-3 py-1 text-[13px] font-medium text-m-doctoral">
                      À compléter
                    </span>
                  ) : null}
                </div>
                <div className="grid gap-2">
                  <Link
                    href={`/gestion/${copy.slug}/${o.id}`}
                    className="rounded-lg bg-accent py-2.5 text-center text-[15px] font-medium text-on-accent transition hover:bg-[#1b2221]"
                  >
                    Gérer
                  </Link>
                  <Link
                    href={`/gestion/${copy.slug}/${o.id}#inscrits`}
                    className="rounded-lg border border-border py-2.5 text-center text-[15px] text-foreground transition hover:border-foreground"
                  >
                    Inscrits ({taken})
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <section className="rounded-lg border border-border bg-background p-6">
          <p className="text-[15px] text-muted">{copy.empty}</p>
        </section>
      )}
    </div>
  );
}
