import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight, CircleUser, MapPin } from "lucide-react";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import {
  getStudentAllSessions,
  getStudentProfile,
  getStudentAssignments,
  getStudentCompletedIds,
} from "@/lib/data/student";
import { getParcours, parcoursSlugOf } from "@/lib/data/parcours";
import { COURSES_VISIBLE_UNTIL, PROMOTION } from "@/lib/promotion";
import { INK } from "@/lib/ministry";

const TRACK_COLORS: Record<string, string> = {
  coeur: "#8b6fc0",
  caractere: "#4a7bc4",
  sensibilite: "#27302f",
};

function formatSessionDateWithYear(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatHours(start: string, end: string) {
  const f = (t: string) => t.slice(0, 5).replace(/^0/, "").replace(":", " h ").replace(/ h 00$/, " h");
  return `${f(start)}–${f(end)}`;
}

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ onglet?: string }>;
};

export default async function ParcoursPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { onglet } = await searchParams;
  // La Sensibilité ministérielle n'est pas encore ouverte : aucune page à ouvrir
  if (slug === "sensibilite") redirect("/etudiant/cours");
  const tab = onglet === "passes" ? "passes" : "a_venir";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [parcours, sessions, { ministryName }] = await Promise.all([
    getParcours(supabase),
    getStudentAllSessions(supabase, user!.id),
    getStudentProfile(supabase, user!.id),
  ]);

  const p = parcours.find((x) => x.slug === slug);
  if (!p) notFound();

  // On conserve rigoureusement la couleur du parcours (gris encre de la charte pour la sensibilité)
  const trackColor = TRACK_COLORS[slug] ?? INK;

  // Seules les sessions d'octobre à décembre sont visibles ; la suite arrive une fois le contenu finalisé
  const mine = sessions.filter((s) => parcoursSlugOf(s.track) === slug && s.session_date <= COURSES_VISIBLE_UNTIL);
  const sessionIds = mine.map((s) => s.id);

  const [assignments, completedIds] = await Promise.all([
    getStudentAssignments(supabase, sessionIds),
    getStudentCompletedIds(supabase, user!.id),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = mine.filter((s) => s.session_date >= today);
  const past = mine.filter((s) => s.session_date < today);
  const displayedSessions = tab === "passes" ? past : upcoming;

  return (
    <div className="space-y-6">
      {/* ── Titre de page ── */}
      <div>
        <p className="text-sm text-muted">Promotion {PROMOTION}</p>
        <h1 className="font-title text-[24px] leading-tight text-foreground sm:text-[28px]">
          Votre parcours de cours
        </h1>
      </div>

      {/* ── Lien retour ── */}
      <div>
        <BackButton fallbackHref="/etudiant/cours" fallbackLabel="Retour à Mes cours" />
      </div>

      {/* ── Hero Card du parcours ── */}
      <section className="rounded-2xl border border-border bg-background p-5 sm:rounded-3xl sm:p-8">
        <span
          className="inline-flex items-center rounded-full px-3.5 py-1 text-[12px] font-semibold"
          style={{
            backgroundColor: `color-mix(in srgb, ${trackColor} 18%, transparent)`,
            color: trackColor,
          }}
        >
          {p.title}
        </span>

        <h2
          className="font-title mt-4 text-[26px] sm:text-[38px] font-bold leading-tight"
          style={{ color: trackColor }}
        >
          {p.title}
        </h2>

        <p className="mt-3 max-w-3xl text-[16px] leading-relaxed text-muted">
          {p.description}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          {slug === "sensibilite" && ministryName && (
            <span className="rounded-full border border-border bg-surface px-4 py-1.5 text-[13px] font-semibold text-foreground">
              Orientation : {ministryName}
            </span>
          )}
          {p.period_label && (
            <span className="rounded-full border border-border bg-background px-4 py-1.5 text-[13px] text-muted">
              {p.period_label}
            </span>
          )}
          {p.schedule_label && (
            <span className="rounded-full border border-border bg-background px-4 py-1.5 text-[13px] text-muted">
              {p.schedule_label}
            </span>
          )}
          <span className="rounded-full border border-border bg-background px-4 py-1.5 text-[13px] text-muted">
            {p.planned_sessions} sessions
          </span>
        </div>
      </section>

      {/* ── Sélecteur d'onglets (À venir / Passés) ── */}
      <div className="flex items-center gap-2">
        <nav className="inline-flex rounded-xl border border-border bg-surface/50 p-1">
          <Link
            href={`/etudiant/cours/parcours/${slug}`}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[14px] font-medium transition ${
              tab === "a_venir"
                ? "bg-accent text-on-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            À venir
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                tab === "a_venir"
                  ? "bg-white/20 text-on-accent"
                  : "bg-surface text-muted"
              }`}
            >
              {upcoming.length}
            </span>
          </Link>
          <Link
            href={`/etudiant/cours/parcours/${slug}?onglet=passes`}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[14px] font-medium transition ${
              tab === "passes"
                ? "bg-accent text-on-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            Passés
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                tab === "passes"
                  ? "bg-white/20 text-on-accent"
                  : "bg-surface text-muted"
              }`}
            >
              {past.length}
            </span>
          </Link>
        </nav>
      </div>

      {/* ── Liste des séances ── */}
      {displayedSessions.length ? (
        <ul className="space-y-4">
          {displayedSessions.map((s) => {
            const sessionAssignments = assignments.filter((a) => a.session_id === s.id);
            const hasAssignment = sessionAssignments.length > 0;
            const isCompleted = hasAssignment && sessionAssignments.every((a) => completedIds.has(a.id));
            const isPast = s.session_date < today;
            const teacherName = s.teacher?.full_name ?? s.speaker_name;

            return (
              <li key={s.id}>
                <Link
                  href={`/etudiant/seances/${s.id}`}
                  className="group flex flex-col justify-between gap-4 rounded-2xl border border-border bg-background p-6 transition hover:border-foreground/30 hover:shadow-sm sm:flex-row sm:items-center"
                >
                  {/* Colonne gauche : Date et Horaire */}
                  <div className="shrink-0 sm:w-[210px]">
                    <p className="text-[15px] font-semibold" style={{ color: trackColor }}>
                      {formatSessionDateWithYear(s.session_date)}
                    </p>
                    <p className="mt-0.5 text-[13px] text-muted">
                      {formatHours(s.start_time, s.end_time)}
                    </p>
                  </div>

                  {/* Colonne centrale : Badge parcours, Titre du cours, Intervenant & Lieu */}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <span
                        className="inline-flex items-center rounded-full px-3 py-0.5 text-[11px] font-semibold"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${trackColor} 18%, transparent)`,
                          color: trackColor,
                        }}
                      >
                        {p.title}
                      </span>
                    </div>

                    <h3 className="font-title text-[20px] font-bold leading-snug text-foreground">
                      {s.courses?.title ?? s.description ?? "Séance"}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-[13px] text-muted">
                      {teacherName && (
                        <span className="inline-flex items-center gap-1.5">
                          <CircleUser size={15} className="shrink-0 text-muted" />
                          {teacherName}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin size={15} className="shrink-0 text-muted" />
                        {s.location || "MLK Studio"}{s.room ? ` · ${s.room}` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Colonne droite : Statut, Travail & Flèche */}
                  <div className="flex shrink-0 items-center justify-between gap-5 border-t border-border-soft pt-2 sm:border-t-0 sm:justify-end sm:pt-0">
                    <div className="text-left sm:text-right">
                      <span className="inline-block rounded-full bg-surface px-3 py-1 text-[12px] font-medium text-muted">
                        {isPast ? "Passée" : "À venir"}
                      </span>
                      <p className="mt-1 text-[12px] font-medium text-muted">
                        {hasAssignment ? (isCompleted ? "Travail rendu" : "Travail à préparer") : "Travail à préparer"}
                      </p>
                    </div>
                    <ChevronRight
                      size={18}
                      className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-2xl border border-border bg-background p-8 text-center text-[15px] text-muted">
          {tab === "passes"
            ? "Aucune session passée pour le moment."
            : "Aucune session à venir pour ce parcours."}
        </div>
      )}

      {/* ── Suite du programme : grisée, pas encore disponible ── */}
      {tab === "a_venir" && (
        <div
          aria-disabled="true"
          className="pointer-events-none select-none rounded-2xl border border-dashed border-border bg-surface/60 p-6 text-center text-[15px] font-medium text-muted opacity-70"
        >
          Votre programme sera bientôt disponible.
        </div>
      )}
    </div>
  );
}
