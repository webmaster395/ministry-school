import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, ChevronLeft, Clock, MapPin, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getStudentAllSessions,
  getStudentAssignments,
  getStudentCompletedIds,
  getStudentMaterials,
  getStudentProfile,
} from "@/lib/data/student";
import { formatSessionDate, formatTimeRange } from "@/lib/format";
import { getMinistry, INK, sessionColor } from "@/lib/ministry";
import MaterialLink from "@/components/MaterialLink";
import { toggleAssignment } from "../../travail/actions";

const lines = (text: string | null | undefined) =>
  (text ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [sessions, { ministrySlug }, doneIds] = await Promise.all([
    getStudentAllSessions(supabase, user!.id),
    getStudentProfile(supabase, user!.id),
    getStudentCompletedIds(supabase, user!.id),
  ]);
  const s = sessions.find((x) => x.id === id);
  if (!s) notFound();

  const [materials, assignments] = await Promise.all([
    getStudentMaterials(supabase, [s.id]),
    getStudentAssignments(supabase, [s.id]),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const past = s.session_date < today;
  const color = sessionColor(s.track, s.session_type, getMinistry(ministrySlug)?.color ?? INK);
  const title = s.courses?.title ?? s.description ?? "Séance";
  const objectives = lines(s.objectives);
  const refs = lines(s.bible_refs);
  const place = s.room ? `${s.location} · ${s.room}` : s.location;
  const teacher = s.teacher?.full_name ?? null;

  const info: [string, string][] = [
    ["Date", formatSessionDate(s.session_date)],
    ["Horaire", formatTimeRange(s.start_time, s.end_time)],
    ...(teacher ? ([["Intervenant", teacher]] as [string, string][]) : []),
    ["Lieu", place],
  ];

  return (
    <div className="space-y-5">
      <Link
        href={`/etudiant/calendrier?jour=${s.session_date}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ChevronLeft size={16} /> Retour à la journée
      </Link>

      <div className="grid items-start gap-[22px] lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <section className="rounded-lg border border-border bg-background p-6">
            <div className="flex items-center justify-between gap-3">
              {s.track ? (
                <span
                  className="label rounded-full px-3 py-1 text-[11px] tracking-[0.1em] text-foreground"
                  style={{ background: `color-mix(in srgb, ${color} 28%, transparent)` }}
                >
                  {s.track}
                </span>
              ) : (
                <span />
              )}
              <span className="label rounded-full bg-surface px-3 py-1 text-[11px] tracking-[0.1em] text-muted">
                {past ? "Passée" : "À venir"}
              </span>
            </div>

            <h2 className="font-title mt-5 text-[32px] leading-tight text-foreground">{title}</h2>

            <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-border-soft pt-5 text-[15px] text-muted sm:grid-cols-2">
              <Row icon={<Calendar size={17} strokeWidth={1.6} />}>
                {formatSessionDate(s.session_date)}
              </Row>
              <Row icon={<Clock size={17} strokeWidth={1.6} />}>
                {formatTimeRange(s.start_time, s.end_time)}
              </Row>
              <Row icon={<MapPin size={17} strokeWidth={1.6} />}>{place}</Row>
              {teacher && <Row icon={<UserRound size={17} strokeWidth={1.6} />}>{teacher}</Row>}
            </dl>
          </section>

          {(s.summary || objectives.length > 0) && (
            <section className="rounded-lg border border-border bg-background p-6">
              <h3 className="font-title text-[22px] text-foreground">À propos de ce cours</h3>
              {s.summary && (
                <p className="mt-1 text-[15px] leading-relaxed text-muted">{s.summary}</p>
              )}
              {objectives.length > 0 && (
                <>
                  <h4 className="font-title mt-6 text-[18px] text-foreground">Objectifs</h4>
                  <ul className="mt-2 space-y-2 text-[15px] text-foreground">
                    {objectives.map((o) => (
                      <li key={o} className="flex gap-3">
                        <span
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: color }}
                        />
                        {o}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}

          {refs.length > 0 && (
            <section className="rounded-lg border border-border bg-background p-6">
              <h3 className="font-title text-[22px] text-foreground">Références bibliques</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {refs.map((r) => (
                  <span
                    key={r}
                    className="rounded-lg border border-border px-4 py-2 text-[15px] text-foreground"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-lg border border-border bg-background p-6">
            <h3 className="font-title text-[22px] text-foreground">Ressources</h3>
            {materials.length ? (
              <>
                <p className="mt-1 text-sm text-muted">
                  {materials.length} élément{materials.length > 1 ? "s" : ""} disponible
                  {materials.length > 1 ? "s" : ""}
                </p>
                <ul className="mt-4 divide-y divide-border-soft">
                  {materials.map((m) => (
                    <li key={m.id} className="py-3 text-[15px]">
                      <MaterialLink title={m.title} url={m.link_url ?? m.file_url} />
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">
                Les supports apparaîtront ici quand l&apos;enseignant les aura publiés.
              </p>
            )}
          </section>

          <section className="rounded-lg border border-border bg-background p-6">
            <h3 className="font-title text-[22px] text-foreground">Travail associé à ce cours</h3>
            {assignments.length ? (
              <ul className="mt-3 divide-y divide-border-soft">
                {assignments.map((a) => {
                  const done = doneIds.has(a.id);
                  const meta = [
                    a.kind,
                    a.duration_min ? `${a.duration_min} min` : null,
                    a.due_at
                      ? `Échéance ${new Date(a.due_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                        })}`
                      : null,
                  ].filter(Boolean);
                  return (
                    <li key={a.id}>
                      <form
                        action={toggleAssignment}
                        className="flex flex-wrap items-center justify-between gap-3 py-4"
                      >
                        <input type="hidden" name="assignment_id" value={a.id} />
                        <input type="hidden" name="done" value={done ? "1" : "0"} />
                        <div className="min-w-0">
                          <p className="text-[16px] font-semibold text-foreground">
                            {a.instructions}
                          </p>
                          {meta.length > 0 && (
                            <p className="mt-0.5 text-sm text-muted">{meta.join(" · ")}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="label rounded-full bg-surface px-3 py-1 text-[11px] tracking-[0.1em] text-muted">
                            {done ? "Terminé" : "À préparer"}
                          </span>
                          <button
                            type="submit"
                            className="text-sm font-medium text-foreground underline underline-offset-2"
                          >
                            {done ? "Marquer comme non terminé" : "Marquer comme terminé"}
                          </button>
                        </div>
                      </form>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">Aucun travail pour ce cours.</p>
            )}
          </section>
        </div>

        <aside className="rounded-lg border border-border bg-background p-6">
          <h3 className="font-title text-[22px] text-foreground">Informations pratiques</h3>
          <dl className="mt-3 divide-y divide-border-soft">
            {info.map(([label, value]) => (
              <div key={label} className="py-3.5">
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="mt-0.5 text-[15px] font-semibold text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </div>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-muted">{icon}</span>
      <span>{children}</span>
    </div>
  );
}
