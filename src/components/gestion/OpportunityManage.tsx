import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronLeft, CircleUser, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getOpportunities,
  getOpportunityCounts,
  KIND_LABEL,
  statusOf,
  STATUS_LABEL,
  type OpportunityKind,
} from "@/lib/data/opportunities";
import ReportUpload from "@/components/ReportUpload";
import { signedAvatarUrls } from "@/lib/avatars";
import { formatSessionDate } from "@/lib/format";
import { setRegistrationOpen } from "@/app/etudiant/services/actions";

const COPY: Record<OpportunityKind, { slug: string; back: string }> = {
  projet: { slug: "projets", back: "Mes projets" },
  formation: { slug: "services", back: "Mes formations" },
};

/**
 * La page « Gérer » d'une formation ou d'un projet : ses dates et comptes rendus, la liste des
 * inscrits et l'ouverture des inscriptions. Réservée à son auteur et aux administrateurs.
 */
export default async function OpportunityManage({ id, kind }: { id: string; kind: OpportunityKind }) {
  const copy = COPY[kind];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [all, counts, { data: me }] = await Promise.all([
    getOpportunities(supabase),
    getOpportunityCounts(supabase),
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
  ]);
  const o = all.find((x) => x.id === id && x.kind === kind);
  if (!o || (o.created_by !== user!.id && me?.role !== "admin")) notFound();

  const today = new Date().toISOString().slice(0, 10);
  const taken = counts.get(o.id) ?? 0;
  const status = statusOf(o, taken, today);
  const organizer = o.organizer_label ?? o.services?.name;

  const [{ data: dateRows }, { data: reportRows }, { data: participantRows }] = await Promise.all([
    supabase
      .from("opportunity_dates")
      .select("session_date, start_time, end_time, room")
      .eq("opportunity_id", o.id)
      .order("session_date"),
    supabase.from("opportunity_reports").select("session_date, file_name").eq("opportunity_id", o.id),
    supabase.rpc("opportunity_participants", { p_opp: o.id }),
  ]);
  const dates = (dateRows ?? []) as { session_date: string; start_time: string; end_time: string; room: string | null }[];
  const reportOf = new Map((reportRows ?? []).map((r) => [r.session_date as string, r.file_name as string]));
  const participants = (participantRows ?? []) as { full_name: string; avatar_path: string | null }[];
  const photos = await signedAvatarUrls(supabase, participants.map((p) => p.avatar_path));

  return (
    <div className="space-y-5">
      <Link href={`/gestion/${copy.slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ChevronLeft size={16} /> {copy.back}
      </Link>

      <div className="grid items-start gap-[22px] lg:grid-cols-[1fr_340px]">
        <section className="rounded-lg border border-border bg-background p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <span className="label rounded-full bg-surface px-3 py-1 text-[11px] tracking-[0.1em] text-foreground">
              {KIND_LABEL[o.kind]}
            </span>
            <span className="label rounded-full bg-surface px-3 py-1 text-[11px] tracking-[0.1em] text-muted">
              {STATUS_LABEL[status]}
            </span>
          </div>

          <h2 className="font-title mt-5 text-[28px] leading-tight text-foreground">{o.title}</h2>
          <p className="mt-4 whitespace-pre-line text-[16px] leading-relaxed text-muted">{o.description}</p>

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
            <div className="flex items-center gap-2.5">
              <Users size={17} strokeWidth={1.6} />
              {o.capacity !== null ? `${taken} inscrits sur ${o.capacity}` : `${taken} inscrit${taken > 1 ? "s" : ""}`}
            </div>
          </dl>

          <div className="mt-6 border-t border-border-soft pt-5">
            <h3 className="font-title text-[20px] text-foreground">Dates et comptes rendus</h3>
            {dates.length ? (
              <ul className="mt-2 divide-y divide-border-soft">
                {dates.map((d) => {
                  const passed = d.session_date <= today;
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
                      {passed && (
                        <span className="text-right">
                          <span className="label mr-3 rounded-full bg-surface px-2.5 py-1 text-[10px] tracking-[0.1em] text-muted">
                            {reportOf.has(d.session_date) ? `Compte rendu : ${reportOf.get(d.session_date)}` : "Compte rendu attendu"}
                          </span>
                          <ReportUpload opportunityId={o.id} sessionDate={d.session_date} hasReport={reportOf.has(d.session_date)} />
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">Aucune date n&apos;est encore enregistrée.</p>
            )}
          </div>
        </section>

        <aside id="inscrits" className="scroll-mt-6 rounded-lg border border-border bg-background p-6">
          <h3 className="font-title text-[22px] text-foreground">Inscrits</h3>
          <p className="mt-1 text-sm text-muted">
            {participants.length} inscrit{participants.length > 1 ? "s" : ""}
          </p>
          {participants.length > 0 && (
            <ul className="mt-3 divide-y divide-border-soft text-[15px] text-foreground">
              {participants.map((p, i) => (
                <li key={i} className="flex items-center gap-3 py-2">
                  {p.avatar_path && photos.get(p.avatar_path) ? (
                    // eslint-disable-next-line @next/next/no-img-element -- adresse temporaire signée
                    <img src={photos.get(p.avatar_path)} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <span className="font-title flex h-8 w-8 items-center justify-center rounded-full bg-surface text-xs text-foreground">
                      {p.full_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  {p.full_name}
                </li>
              ))}
            </ul>
          )}
          {status !== "termine" && (
            <form action={setRegistrationOpen} className="mt-4">
              <input type="hidden" name="opportunity_id" value={o.id} />
              <input type="hidden" name="open" value={o.registration_open ? "0" : "1"} />
              <button type="submit" className="text-sm font-medium text-foreground underline underline-offset-2">
                {o.registration_open ? "Fermer les inscriptions" : "Ouvrir les inscriptions"}
              </button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
