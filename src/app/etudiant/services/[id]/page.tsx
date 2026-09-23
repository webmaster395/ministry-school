import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronLeft, CircleUser, Users } from "lucide-react";
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
import { formatSessionDate } from "@/lib/format";
import { toggleRegistration } from "../actions";

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [all, counts, mine] = await Promise.all([
    getOpportunities(supabase),
    getOpportunityCounts(supabase),
    getMyRegistrationIds(supabase, user!.id),
  ]);
  const o = all.find((x) => x.id === id);
  if (!o) notFound();

  const today = new Date().toISOString().slice(0, 10);
  const taken = counts.get(o.id) ?? 0;
  const status = statusOf(o, taken, today);
  const registered = mine.has(o.id);
  const color = KIND_COLOR[o.kind];
  const places = placesLabel(o, taken);
  const organizer = o.organizer_label ?? o.services?.name;

  const { data: dateRows } = await supabase
    .from("opportunity_dates")
    .select("session_date, start_time, end_time, room")
    .eq("opportunity_id", o.id)
    .order("session_date");
  const dates = (dateRows ?? []) as { session_date: string; start_time: string; end_time: string; room: string | null }[];

  const canJoin = registered || status === "disponible";

  return (
    <div className="space-y-5">
      <Link
        href="/etudiant/services"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ChevronLeft size={16} /> Services et projets
      </Link>

      <div className="grid items-start gap-[22px] lg:grid-cols-[1fr_340px]">
        <section className="rounded-lg border border-border bg-background p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <span
              className="label rounded-full px-3 py-1 text-[11px] tracking-[0.1em] text-foreground"
              style={{ background: `color-mix(in srgb, ${color} 22%, transparent)` }}
            >
              {KIND_LABEL[o.kind]}
            </span>
            <span className="label rounded-full bg-surface px-3 py-1 text-[11px] tracking-[0.1em] text-muted">
              {registered && status !== "termine" ? "Inscrit" : STATUS_LABEL[status]}
            </span>
          </div>

          <h2 className="font-title mt-5 text-[28px] leading-tight text-foreground">{o.title}</h2>
          <p className="mt-4 whitespace-pre-line text-[16px] leading-relaxed text-muted">
            {o.description}
          </p>

          <dl className="mt-6 grid gap-3 border-t border-border-soft pt-5 text-[15px] text-muted sm:grid-cols-2">
            {organizer && (
              <div className="flex items-center gap-2.5">
                <CircleUser size={17} strokeWidth={1.6} /> {organizer}
              </div>
            )}
            {o.schedule_label && (
              <div className="flex items-center gap-2.5">
                <CalendarDays size={17} strokeWidth={1.6} /> {o.schedule_label}
              </div>
            )}
            {places && (
              <div className="flex items-center gap-2.5">
                <Users size={17} strokeWidth={1.6} /> {places}
              </div>
            )}
          </dl>

          {dates.length > 0 && (
            <div className="mt-6 border-t border-border-soft pt-5">
              <h3 className="font-title text-[20px] text-foreground">Dates</h3>
              <ul className="mt-2 divide-y divide-border-soft">
                {dates.map((d) => {
                  return (
                    <li key={d.session_date} className="flex flex-wrap items-center justify-between gap-3 py-3 text-[15px]">
                      <span className="text-foreground">
                        {formatSessionDate(d.session_date)}
                        <span className="text-muted">
                          {" "}
                          · {d.start_time.slice(0, 5).replace(":", " h ")} – {d.end_time.slice(0, 5).replace(":", " h ")}
                          {d.room ? ` · ${d.room}` : ""}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-border bg-background p-6">
            <h3 className="font-title text-[22px] text-foreground">Inscription</h3>
            {status === "termine" ? (
              <p className="mt-2 text-sm text-muted">Cette proposition est terminée.</p>
            ) : (
              <>
                <p className="mt-2 text-sm text-muted">
                  {registered
                    ? "Vous êtes inscrit. Vous pouvez vous désinscrire à tout moment."
                    : status === "a_venir"
                      ? "Les inscriptions ne sont pas encore ouvertes."
                      : status === "complet"
                        ? "Il n'y a plus de place."
                        : "Inscrivez-vous pour participer."}
                </p>
                {canJoin && (
                  <form action={toggleRegistration} className="mt-4">
                    <input type="hidden" name="opportunity_id" value={o.id} />
                    <input type="hidden" name="registered" value={registered ? "1" : "0"} />
                    <button
                      type="submit"
                      className={`label w-full rounded-full px-6 py-3.5 text-xs tracking-[0.12em] transition ${
                        registered
                          ? "border border-foreground text-foreground hover:bg-surface"
                          : "bg-accent text-on-accent hover:bg-[#1b2221]"
                      }`}
                    >
                      {registered ? "Se désinscrire" : "S'inscrire"}
                    </button>
                  </form>
                )}
              </>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
