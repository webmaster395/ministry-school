import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, Check, Clock } from "lucide-react";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import {
  getMyRegistrationIds,
  getOpportunities,
  getOpportunityCounts,
  KIND_COLOR,
  KIND_LABEL,
  placesLabel,
  statusOf,
  STATUS_LABEL,
} from "@/lib/data/opportunities";
import { DETAILS_ENABLED, linesOf } from "@/lib/opportunity-details";
import { toggleRegistration } from "../actions";

type DateRow = { session_date: string; start_time: string; end_time: string; room: string | null };

const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
const dayMonth = (iso: string) => {
  const d = Number(iso.slice(8, 10));
  return `${d === 1 ? "1er" : d} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
};
const fullDate = (iso: string) => `${dayMonth(iso)} ${iso.slice(0, 4)}`;
const hm = (t: string) => t.slice(0, 5).replace(":", " h ").replace(/ h 00$/, " h");
const range = (d: DateRow) => `${hm(d.start_time)}–${hm(d.end_time)}`;
const joinAnd = (parts: string[]) =>
  parts.length < 2 ? parts.join("") : `${parts.slice(0, -1).join(", ")} et ${parts[parts.length - 1]}`;

/** « 5 septembre, 3 octobre et 7 novembre 2026 » ; les dates de plusieurs années gardent chacune la leur. */
function periodOf(dates: DateRow[], fallback: string | null) {
  if (!dates.length) return fallback;
  const days = dates.map((d) => d.session_date);
  const sameYear = days.every((d) => d.slice(0, 4) === days[0].slice(0, 4));
  return sameYear ? `${joinAnd(days.map(dayMonth))} ${days[0].slice(0, 4)}` : joinAnd(days.map(fullDate));
}

const Checklist = ({ items }: { items: string[] }) => (
  <ul className="mt-3 space-y-2.5 text-[15px] text-foreground">
    {items.map((item) => (
      <li key={item} className="flex items-start gap-3">
        <Check size={17} strokeWidth={2} className="mt-0.5 shrink-0" />
        {item}
      </li>
    ))}
  </ul>
);

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [all, counts, mine, { data: me }] = await Promise.all([
    getOpportunities(supabase),
    getOpportunityCounts(supabase),
    getMyRegistrationIds(supabase, user!.id),
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
  ]);
  const o = all.find((x) => x.id === id);
  if (!o) redirect("/etudiant/services");

  const isAdmin = me?.role === "admin";
  const isOwner = o.created_by === user!.id;
  if (!o.registration_open && !isAdmin && !isOwner) {
    redirect("/etudiant/services");
  }

  const today = new Date().toISOString().slice(0, 10);
  const taken = counts.get(o.id) ?? 0;
  const status = statusOf(o, taken, today);
  const registered = mine.has(o.id);
  const color = KIND_COLOR[o.kind];
  const places = placesLabel(o, taken);
  const organizer = o.organizer_label ?? o.services?.name ?? null;

  const [{ data: dateRows }, { data: lead }] = await Promise.all([
    supabase
      .from("opportunity_dates")
      .select("session_date, start_time, end_time, room")
      .eq("opportunity_id", o.id)
      .order("session_date"),
    // Fonction de la base (SQL fourni) : sans elle, on affiche seulement l'équipe organisatrice
    supabase.rpc("opportunity_lead", { p_opp: o.id }),
  ]);
  const dates = (dateRows ?? []) as DateRow[];

  const period = periodOf(dates, o.schedule_label);
  const hours = [...new Set(dates.map(range))];
  const rooms = [...new Set(dates.map((d) => d.room).filter(Boolean) as string[])];
  const objectives = linesOf(o.objectives);
  const prerequisites = linesOf(o.prerequisites);

  const leadName = typeof lead === "string" && lead.trim() ? lead : null;
  const initials = (leadName ?? organizer ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  const canJoin = o.registration_open && (registered || status === "disponible");
  const target = o.kind === "projet" ? "ce projet" : "cette formation";

  const facts: { label: string; value: string | null }[] = [
    { label: "Date ou période", value: period },
    { label: "Horaire", value: hours.length ? hours.join(" · ") : null },
    { label: "Lieu", value: rooms.length ? rooms.join(", ") : null },
    { label: "Places", value: o.capacity !== null ? `${o.capacity} au total` : null },
    { label: "Disponibilité", value: places },
  ];

  return (
    <div className="space-y-5">
      {!o.registration_open && (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 text-[14px]">
          <Clock size={18} className="mt-0.5 shrink-0 text-muted" />
          <p className="text-foreground">
            <strong className="font-semibold">Mode aperçu :</strong>{" "}
            <span className="text-muted">
              Cette proposition est en attente de validation administrative. Elle n&apos;est pas visible par les étudiants et les inscriptions sont fermées.
            </span>
          </p>
        </div>
      )}
      <BackButton
        fallbackHref="/etudiant/services"
        fallbackLabel="Retour aux services et projets"
      />

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_340px]">
        <article className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <span
              className="rounded-full px-3 py-1 text-[12px] font-semibold text-white"
              style={{ background: color }}
            >
              {KIND_LABEL[o.kind]}
            </span>
            <span className="text-[13px] text-muted">
              {registered && status !== "termine" ? "Inscrit" : STATUS_LABEL[status]}
            </span>
          </div>

          <h2 className="font-title mt-5 text-[32px] leading-tight text-foreground">{o.title}</h2>
          <p className="mt-3 whitespace-pre-line text-[16px] leading-relaxed text-muted">{o.description}</p>

          {objectives.length > 0 && (
            <section className="mt-8">
              <h3 className="font-title text-[20px] text-foreground">
                Objectifs {o.kind === "projet" ? "du projet" : "de la formation"}
              </h3>
              <Checklist items={objectives} />
            </section>
          )}

          {DETAILS_ENABLED && (
            <section className="mt-8 border-t border-border pt-6">
              <h3 className="font-title text-[20px] text-foreground">Prérequis</h3>
              <Checklist items={prerequisites.length ? prerequisites : ["Aucun prérequis particulier"]} />
            </section>
          )}

          {dates.length > 0 && (
            <section className="mt-8 border-t border-border pt-6">
              <h3 className="font-title text-[20px] text-foreground">Dates et déroulement</h3>
              <ul className="mt-2 divide-y divide-border-soft">
                {dates.map((d) => (
                  <li key={d.session_date} className="flex items-center justify-between gap-4 py-4 text-[15px]">
                    <span className="flex items-center gap-3 text-foreground">
                      <CalendarDays size={18} strokeWidth={1.6} className="shrink-0" />
                      {fullDate(d.session_date)}
                    </span>
                    <span className="text-[13px] text-muted">{range(d)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(leadName || organizer) && (
            <section className="mt-8 border-t border-border pt-6">
              <h3 className="font-title text-[20px] text-foreground">Responsable</h3>
              <div className="mt-4 flex items-center gap-4">
                <span className="font-title flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-[14px] text-foreground">
                  {initials}
                </span>
                <span>
                  <span className="block text-[16px] font-semibold text-foreground">{leadName ?? organizer}</span>
                  {leadName && organizer && <span className="block text-[13px] text-muted">{organizer}</span>}
                </span>
              </div>
            </section>
          )}
        </article>

        <aside className="rounded-2xl border border-border bg-background p-6">
          <dl className="divide-y divide-border-soft">
            {facts
              .filter((f) => f.value)
              .map((f) => (
                <div key={f.label} className="py-3.5 first:pt-0">
                  <dt className="text-[13px] text-muted">{f.label}</dt>
                  <dd className="mt-1 text-[15px] font-semibold text-foreground">{f.value}</dd>
                </div>
              ))}
          </dl>

          {status === "termine" ? (
            <p className="mt-4 text-sm text-muted">Cette proposition est terminée.</p>
          ) : (
            <>
              {canJoin ? (
                <form action={toggleRegistration} className="mt-4">
                  <input type="hidden" name="opportunity_id" value={o.id} />
                  <input type="hidden" name="registered" value={registered ? "1" : "0"} />
                  <button
                    type="submit"
                    className={`w-full rounded-full px-6 py-3.5 text-[15px] font-medium transition ${
                      registered
                        ? "border border-foreground text-foreground hover:bg-surface"
                        : "bg-accent text-on-accent hover:bg-[#1b2221]"
                    }`}
                  >
                    {registered ? "Se désinscrire" : `S'inscrire à ${target}`}
                  </button>
                </form>
              ) : (
                <p className="mt-4 text-sm text-muted">
                  {status === "a_venir" ? "Les inscriptions ne sont pas encore ouvertes." : "Il n'y a plus de place."}
                </p>
              )}
              {registered && (
                <p className="mt-2 text-center text-[13px] text-muted">
                  Vous êtes inscrit. Vous pouvez vous désinscrire à tout moment.
                </p>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
