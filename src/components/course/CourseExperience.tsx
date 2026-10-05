/* eslint-disable @next/next/no-img-element -- portraits distants stockés dans Supabase */
import type { CSSProperties } from "react";
import Link from "next/link";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock, ExternalLink, FileText, Link2, MapPin, Play, Presentation, Video } from "lucide-react";
import BackButton from "@/components/BackButton";
import { toggleAssignment } from "@/app/etudiant/travail/actions";

type Trainer = { id: string; name: string; title: string | null; bio: string | null; photoUrl: string | null };
type Material = { id: string; title: string; description?: string | null; resource_type?: string | null; link_url: string | null; file_url: string | null };
type Assignment = { id: string; title?: string | null; description?: string | null; instructions: string; content_type?: string | null; resource_url?: string | null; file_url?: string | null; phase?: string | null; due_at: string | null; kind: string | null; duration_min: number | null; demo?: boolean };
type CourseSession = { id: string; title: string; track: string | null; summary: string | null; description: string | null; objectives: string[]; videoUrl: string | null; videoDemo: boolean; date: string; dateIso: string; hours: string; place: string; past: boolean; accent: string };

function initials(name: string) { return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }

function videoEmbed(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) return `https://www.youtube.com/embed/${parsed.searchParams.get("v")}`;
    if (parsed.hostname === "youtu.be") return `https://www.youtube.com/embed/${parsed.pathname.slice(1)}`;
    if (parsed.hostname.includes("vimeo.com")) return `https://player.vimeo.com/video/${parsed.pathname.split("/").filter(Boolean).pop()}`;
  } catch { return null; }
  return null;
}

function TrainerAvatars({ trainers }: { trainers: Trainer[] }) {
  return <div className="flex items-center gap-4"><div className="flex -space-x-3">{trainers.map((trainer) => <span key={trainer.id} className="grid h-12 w-12 place-items-center overflow-hidden rounded-full border-[3px] border-[var(--course-hero)] bg-white/15 text-xs font-bold text-white">{trainer.photoUrl ? <img src={trainer.photoUrl} alt={trainer.name} className="h-full w-full object-cover" /> : initials(trainer.name)}</span>)}</div><p className="text-sm leading-relaxed text-white/80">{trainers.map((trainer) => trainer.name).join(" · ")}</p></div>;
}

function resourceIcon(type?: string | null) {
  const normalized = (type ?? "").toLowerCase();
  if (normalized.includes("présentation")) return Presentation;
  if (normalized.includes("vidéo")) return Video;
  if (normalized.includes("lien")) return Link2;
  return FileText;
}

function actionLabel(type?: string | null, downloadable = false) {
  if (downloadable) return "Télécharger";
  const normalized = (type ?? "").toLowerCase();
  if (normalized.includes("vidéo")) return "Regarder la vidéo";
  if (normalized.includes("lecture") || normalized.includes("pdf")) return "Lire le document";
  if (normalized.includes("exercice") || normalized.includes("question")) return "Faire l’exercice";
  if (normalized.includes("lien")) return "Accéder";
  return "Consulter";
}

function formatDeadline(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function TaskSection({ title, eyebrow, items, completedIds }: { title: string; eyebrow: string; items: Assignment[]; completedIds: Set<string> }) {
  if (!items.length) return null;
  return <section className="border-t border-border py-10 sm:py-14"><p className="label text-xs tracking-[0.18em] text-muted">{eyebrow}</p><h2 className="font-title mt-2 text-3xl text-foreground">{title}</h2><div className="mt-7 space-y-3">{items.map((item, index) => { const done = completedIds.has(item.id); const url = item.resource_url || item.file_url; const deadline = formatDeadline(item.due_at); return <article key={item.id} className="group grid gap-4 rounded-2xl border border-border bg-background p-5 sm:grid-cols-[42px_1fr_auto] sm:items-center"><span className="grid h-10 w-10 place-items-center rounded-full bg-surface text-sm font-semibold text-muted">{String(index + 1).padStart(2, "0")}</span><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-foreground">{item.title || item.instructions}</h3>{item.content_type && <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-muted">{item.content_type}</span>}{item.demo && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-900">Démonstration</span>}</div>{item.title && item.instructions && <p className="mt-1 text-sm leading-relaxed text-muted">{item.instructions}</p>}{item.description && <p className="mt-1 text-sm leading-relaxed text-muted">{item.description}</p>}{deadline && <p className="mt-2 text-xs font-medium text-foreground">À terminer avant le {deadline}</p>}{url && <a href={url} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-semibold text-foreground transition hover:border-foreground">{actionLabel(item.content_type)} <ExternalLink size={14} /></a>}</div>{item.demo ? <span className="text-xs text-muted">Aperçu uniquement</span> : <form action={toggleAssignment}><input type="hidden" name="assignment_id" value={item.id} /><input type="hidden" name="done" value={done ? "1" : "0"} /><button type="submit" className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition ${done ? "border-transparent bg-emerald-700 text-white" : "border-border bg-surface text-foreground hover:border-foreground"}`}><Check size={15} />{done ? "Terminé" : "Marquer terminé"}</button></form>}</article>; })}</div></section>;
}

export default function CourseExperience({ session, trainers, materials, assignments, completedIds, backHref, backLabel, previous, next, previewDemo = false }: {
  session: CourseSession; trainers: Trainer[]; materials: Material[]; assignments: Assignment[]; completedIds: Set<string>; backHref: string; backLabel: string; previous?: { id: string; title: string } | null; next?: { id: string; title: string } | null; previewDemo?: boolean;
}) {
  const courseEnd = new Date(`${session.dateIso}T23:59:59`);
  const before = assignments.filter((item) => item.phase ? item.phase === "before" : !item.due_at || new Date(item.due_at) <= courseEnd);
  const after = assignments.filter((item) => item.phase ? item.phase === "after" : !!item.due_at && new Date(item.due_at) > courseEnd);
  const embed = session.videoUrl ? videoEmbed(session.videoUrl) : null;

  return <div className="course-experience" style={{ "--course-accent": session.accent, "--course-hero": "#202927" } as CSSProperties}>
    <BackButton fallbackHref={backHref} fallbackLabel={backLabel} />
    {previewDemo && <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-950"><strong>Preview de la nouvelle page.</strong> La vidéo et les tâches signalées « Démonstration » servent uniquement à tester l’interface sur ton compte. Elles seront remplacées automatiquement par les contenus renseignés dans l’administration.</div>}
    <section className="relative mt-5 overflow-hidden rounded-[22px] bg-[var(--course-hero)] px-6 py-6 text-white sm:px-8 sm:py-7 lg:px-10 lg:py-8">
      <span className="absolute inset-y-0 left-0 w-1.5 bg-[var(--course-accent)]" />
      <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.8fr)] lg:items-end lg:gap-12">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="label rounded-full px-3 py-1.5 text-[11px] tracking-[0.12em] text-white" style={{ backgroundColor: session.accent }}>{session.track || "COURS"}</span>
            <span className="text-[11px] uppercase tracking-[0.14em] text-white/55">{session.past ? "Disponible" : "À venir"}</span>
          </div>
          <h1 className="font-title mt-4 max-w-3xl text-[clamp(2.15rem,4vw,3.65rem)] leading-none tracking-[-0.035em]">{session.title}</h1>
          {trainers.length > 0 && <div className="mt-5"><TrainerAvatars trainers={trainers} /></div>}
        </div>
        <div className="grid gap-3 border-t border-white/15 pt-5 text-sm text-white/80 sm:grid-cols-2 lg:grid-cols-1 lg:border-l lg:border-t-0 lg:py-1 lg:pl-8">
          <span className="flex items-center gap-2"><CalendarDays size={17} />{session.date}</span>
          <span className="flex items-center gap-2"><Clock size={17} />{session.hours}</span>
          <span className="flex items-start gap-2 sm:col-span-2 lg:col-span-1"><MapPin className="mt-0.5 shrink-0" size={17} /><span>{session.place}</span></span>
        </div>
      </div>
    </section>

    <div className="mx-auto grid max-w-6xl gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:py-14">
      <main id="course-content" className="scroll-mt-24">
        {(session.summary || session.objectives.length > 0) && <section className="pb-9 sm:pb-11"><p className="label text-xs tracking-[0.18em] text-muted">Le cours</p><h2 className="font-title mt-2 text-3xl text-foreground sm:text-[34px]">À propos de ce cours</h2>{session.summary && <p className="mt-4 max-w-3xl text-base leading-7 text-muted">{session.summary}</p>}{session.objectives.length > 0 && <div className="mt-7"><h3 className="text-sm font-semibold text-foreground">Objectifs à l’issue de ce cours</h3><ol className="mt-3 grid border-t border-border-soft sm:grid-cols-2 sm:gap-x-8">{session.objectives.map((objective, index) => <li key={objective} className="flex gap-3 border-b border-border-soft py-3 text-sm leading-6 text-foreground"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--course-accent)] text-[10px] font-semibold text-white">{index + 1}</span><span>{objective}</span></li>)}</ol></div>}</section>}
        <div id="before-course" className="scroll-mt-24"><TaskSection title="À faire avant le cours" eyebrow="Se préparer" items={before} completedIds={completedIds} /></div>
        {(session.videoUrl || materials.length > 0) && <section className="border-t border-border py-9 sm:py-11">
          <p className="label text-xs tracking-[0.18em] text-muted">Bibliothèque</p>
          <h2 className="font-title mt-2 text-2xl text-foreground sm:text-[28px]">Ressources du cours</h2>
          <div className={`mt-6 grid items-start gap-4 ${session.videoUrl && materials.length > 0 ? "sm:grid-cols-2" : ""}`}>
            {session.videoUrl && <article className="max-w-sm overflow-hidden rounded-xl border border-border bg-background">
              <div className="aspect-video bg-black">{embed ? <iframe src={embed} title={`Vidéo — ${session.title}`} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : <video src={session.videoUrl} controls preload="metadata" className="h-full w-full" />}</div>
              <div className="flex items-start gap-3 p-3.5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface"><Play size={17} className="text-[var(--course-accent)]" /></span><div className="min-w-0"><h3 className="text-sm font-semibold text-foreground">Vidéo du cours</h3>{session.videoDemo && <p className="mt-0.5 text-xs leading-relaxed text-amber-800">Vidéo de démonstration</p>}</div></div>
            </article>}
            {materials.length > 0 && <div className="space-y-3">{materials.map((material) => { const Icon = resourceIcon(material.resource_type); const url = material.link_url || material.file_url; return <article key={material.id} className="flex min-h-[84px] items-start gap-3 rounded-xl border border-border bg-background p-3.5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface"><Icon size={17} className="text-muted" /></span><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold leading-snug text-foreground">{material.title}</h3><p className="mt-0.5 text-xs text-muted">{material.description || material.resource_type || "Ressource"}</p>{url && <a href={url} target="_blank" rel="noreferrer" download={!!material.file_url || undefined} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:underline">{actionLabel(material.resource_type, !!material.file_url)} <ExternalLink size={12} /></a>}</div></article>; })}</div>}
          </div>
        </section>}
        <div id="after-course" className="scroll-mt-24"><TaskSection title="À faire après le cours" eyebrow="Mettre en pratique" items={after} completedIds={completedIds} /></div>
      </main>
      <aside className="lg:sticky lg:top-24 lg:self-start"><nav aria-label="Navigation dans le cours" className="rounded-2xl bg-surface p-6"><p className="label text-xs tracking-[0.15em] text-muted">Ton parcours</p><div className="mt-4 space-y-1 text-sm"><a href="#before-course" className="flex min-h-11 items-center gap-3 rounded-xl px-2 transition hover:bg-background"><span className="h-2.5 w-2.5 rounded-full bg-[var(--course-accent)]" />À préparer</a><a href="#course-content" className="flex min-h-11 items-center gap-3 rounded-xl px-2 transition hover:bg-background"><span className="h-2.5 w-2.5 rounded-full bg-[var(--course-accent)]" />Suivre le cours</a><a href="#after-course" className="flex min-h-11 items-center gap-3 rounded-xl px-2 transition hover:bg-background"><span className="h-2.5 w-2.5 rounded-full bg-[var(--course-accent)]" />Mettre en pratique</a></div></nav>{trainers.map((trainer) => trainer.bio && <div key={trainer.id} className="mt-5 border-t border-border pt-5"><p className="text-sm font-semibold text-foreground">{trainer.name}</p>{trainer.title && <p className="text-xs text-muted">{trainer.title}</p>}<p className="mt-2 text-sm leading-relaxed text-muted">{trainer.bio}</p></div>)}</aside>
    </div>
    {(previous || next) && <nav className="grid gap-3 border-t border-border pt-7 sm:grid-cols-2">{previous ? <Link href={`/etudiant/seances/${previous.id}`} className="rounded-2xl border border-border p-5 transition hover:border-foreground"><span className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted"><ChevronLeft size={14} />Cours précédent</span><strong className="mt-2 block text-foreground">{previous.title}</strong></Link> : <span />}{next && <Link href={`/etudiant/seances/${next.id}`} className="rounded-2xl border border-border p-5 text-right transition hover:border-foreground"><span className="flex items-center justify-end gap-2 text-xs uppercase tracking-wider text-muted">Cours suivant<ChevronRight size={14} /></span><strong className="mt-2 block text-foreground">{next.title}</strong></Link>}</nav>}
  </div>;
}
