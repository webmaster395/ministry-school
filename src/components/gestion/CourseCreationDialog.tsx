"use client";

import { useActionState, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BookOpenText,
  CalendarDays,
  Check,
  Clock3,
  FileText,
  MapPin,
  Plus,
  Presentation,
  Video,
  X,
} from "lucide-react";
import Portal from "@/components/Portal";
import AdminSelect from "@/components/admin/AdminSelect";
import DynamicListInput from "@/components/DynamicListInput";
import {
  createCourseDraft,
  type CourseCreationState,
} from "@/app/gestion/cours/actions";

type Choice = { id: string; name: string };
type CreationContext = "admin" | "ministry";

const field =
  "mt-1.5 min-h-11 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-[15px] text-foreground outline-none transition focus:border-foreground";
const section =
  "scroll-mt-24 rounded-2xl border border-border bg-background p-4 sm:p-5";

export default function CourseCreationDialog({
  context,
  parentId,
  defaultDate = "",
  defaultLocation = "",
  defaultParking = true,
  trainers = [],
  ministries = [],
  triggerLabel = "+ Créer un cours",
  triggerClassName,
}: {
  context: CreationContext;
  parentId?: string;
  defaultDate?: string;
  defaultLocation?: string;
  defaultParking?: boolean;
  trainers?: Choice[];
  ministries?: Choice[];
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(
    context === "ministry" ? "Sensibilité ministérielle" : "Formation du cœur",
  );
  const [state, action, pending] = useActionState<CourseCreationState, FormData>(
    createCourseDraft,
    {},
  );
  const ministry = context === "ministry";
  const title = ministry ? "Créer un cours ministériel" : "Créer un cours";
  const nav = useMemo(
    () => [
      ["informations", "Informations"],
      ["planning", "Date et lieu"],
      ["pedagogie", "Pédagogie"],
      ["contenus", "Contenus"],
    ],
    [],
  );

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName ?? "inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent transition hover:bg-[#1b2221]"}
      >
        <Plus size={17} /> {triggerLabel.replace(/^\+\s*/, "")}
      </button>

      {open && (
        <Portal>
          <div className="app-modal-layer fixed inset-0 z-50 bg-black/40">
            <div
              className="flex h-full items-start justify-center sm:items-center sm:p-4"
              onClick={(event) => event.target === event.currentTarget && setOpen(false)}
            >
              <form
                action={action}
                role="dialog"
                aria-modal="true"
                aria-labelledby="course-creation-title"
                className="flex h-dvh w-full max-w-[900px] flex-col overflow-hidden bg-surface shadow-[0_20px_60px_rgba(0,0,0,.24)] sm:h-[min(92dvh,880px)] sm:rounded-3xl sm:border sm:border-border"
                onClick={(event) => event.stopPropagation()}
              >
                <input type="hidden" name="creation_context" value={context} />
                {ministry && <input type="hidden" name="ministry_id" value={parentId ?? ""} />}

                <header className="border-b border-border bg-background px-5 py-4 sm:px-7 sm:py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[.12em] text-muted">Nouveau brouillon</p>
                      <h2 id="course-creation-title" className="font-title mt-1 text-[25px] leading-tight text-foreground sm:text-[29px]">{title}</h2>
                      <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted">Commencez avec les informations du cours, puis enrichissez la vidéo, les ressources et les devoirs dans la fiche complète.</p>
                    </div>
                    <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="rounded-full p-2 text-muted transition hover:bg-surface hover:text-foreground"><X size={20} /></button>
                  </div>
                  <nav aria-label="Sections du formulaire" className="mt-4 flex gap-2 overflow-x-auto pb-1">
                    {nav.map(([id, label], index) => <a key={id} href={`#creation-${id}`} className="shrink-0 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-medium text-foreground transition hover:border-foreground"><span className="mr-1.5 text-muted">{index + 1}.</span>{label}</a>)}
                  </nav>
                </header>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-7">
                  <section id="creation-informations" className={section}>
                    <SectionTitle icon={<BookOpenText size={18} />} title="Informations générales" help="Les éléments qui permettent d’identifier immédiatement le cours." />
                    <div className="mt-4 grid gap-4">
                      <label className="text-sm font-medium text-foreground">Titre du cours <Required /><input autoFocus name="title" required placeholder="Ex. Développer une écoute qui accompagne" className={field} /></label>
                      <label className="text-sm font-medium text-foreground">Présentation<textarea name="summary" rows={4} placeholder="Présentez le sujet, l’approche et ce que les participants vont découvrir…" className={`${field} resize-y leading-6`} /></label>
                      {!ministry && (
                        <label className="text-sm font-medium text-foreground">Catégorie
                          <AdminSelect name="track" value={category} onValueChange={setCategory} className="mt-1.5" options={["Formation du cœur", "Formation du caractère", "Sensibilité ministérielle", "Mise en pratique"].map((value) => ({ value, label: value }))} />
                        </label>
                      )}
                      {context === "admin" && category === "Sensibilité ministérielle" && (
                        <label className="text-sm font-medium text-foreground">Sensibilité <Required /><AdminSelect name="ministry_id" className="mt-1.5" placeholder="Choisir une sensibilité" searchable options={ministries.map((item) => ({ value: item.id, label: item.name }))} /></label>
                      )}
                    </div>
                  </section>

                  <section id="creation-planning" className={section}>
                    <SectionTitle icon={<CalendarDays size={18} />} title="Date, horaires et lieu" help={ministry ? "L’horaire ministériel commun est appliqué automatiquement." : "Planifiez précisément la séance."} />
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label className="text-sm font-medium text-foreground">Date <Required /><input name="session_date" type="date" required min={ministry ? "2027-01-01" : undefined} defaultValue={defaultDate} className={field} /></label>
                      {ministry ? (
                        <div className="rounded-xl border border-border bg-surface px-4 py-3"><span className="flex items-center gap-2 text-xs font-medium text-muted"><Clock3 size={15} /> Horaire ministériel</span><strong className="mt-1 block text-[16px] text-foreground">10 h 30 – 13 h</strong><input type="hidden" name="start_time" value="10:30" /><input type="hidden" name="end_time" value="13:00" /></div>
                      ) : <><label className="text-sm font-medium text-foreground">Début <Required /><input name="start_time" type="time" required className={field} /></label><label className="text-sm font-medium text-foreground">Fin <Required /><input name="end_time" type="time" required className={field} /></label></>}
                      <label className="text-sm font-medium text-foreground sm:col-span-2">Lieu et adresse <Required /><span className="relative block"><MapPin size={17} className="pointer-events-none absolute left-3.5 top-5 text-muted" /><input name="location" required defaultValue={defaultLocation || (ministry ? "Espace Martin Luther King" : "")} placeholder="Ex. MLK Studio · 2 rue Tirard, Créteil" className={`${field} pl-10`} /></span></label>
                      <label className="text-sm font-medium text-foreground">Salle <span className="font-normal text-muted">(facultatif)</span><input name="room" placeholder="Ex. Giroud" className={field} /></label>
                      <label className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground sm:mt-6"><input type="hidden" name="show_parking_notice" value="0" /><input type="checkbox" name="show_parking_notice" value="1" defaultChecked={defaultParking} className="mt-0.5 h-4 w-4 accent-foreground" /><span><strong className="block font-semibold">Afficher l’information parking</strong><small className="mt-0.5 block text-muted">Visible avec les informations pratiques.</small></span></label>
                    </div>
                  </section>

                  <section id="creation-pedagogie" className={section}>
                    <SectionTitle icon={<Presentation size={18} />} title="Cadre pédagogique" help="Ajoutez les personnes, objectifs et références utiles. Chaque liste se complète avec Entrée." />
                    <div className="mt-4 space-y-4">
                      {context === "admin" && trainers.length > 0 && <label className="block text-sm font-medium text-foreground">Intervenant principal<AdminSelect name="trainer_id" className="mt-1.5" placeholder="Choisir dans l’annuaire" searchable options={trainers.map((item) => ({ value: item.id, label: item.name }))} /></label>}
                      <DynamicListInput name="speaker_items" label="Intervenants" placeholder="Nom de l’intervenant" />
                      <DynamicListInput name="objective_items" label="Objectifs pédagogiques" placeholder="Un objectif clair et concret" />
                      <label className="block text-sm font-medium text-foreground">Références bibliques <span className="font-normal text-muted">(facultatif)</span><textarea name="bible_refs" rows={3} placeholder="Un passage ou une référence par ligne" className={`${field} resize-y`} /></label>
                    </div>
                  </section>

                  <section id="creation-contenus" className={section}>
                    <SectionTitle icon={<FileText size={18} />} title="Contenus pédagogiques" help="La fiche complète s’ouvre après la création du brouillon." />
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <ContentCard icon={<Video size={18} />} title="Vidéo" text="Lien, replay et disponibilité indépendante." />
                      <ContentCard icon={<Presentation size={18} />} title="Supports et ressources" text="Fichiers, liens et date de disponibilité." />
                      <ContentCard icon={<Check size={18} />} title="Devoirs" text="Travaux avant ou après, consignes et échéances." />
                    </div>
                  </section>
                </div>

                <footer className="border-t border-border bg-background px-4 py-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:px-7 sm:py-4">
                  {state.error && <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">{state.error}</p>}
                  <div className="flex items-center justify-between gap-3">
                    <p className="hidden text-xs text-muted sm:block"><Required /> Champs indispensables pour enregistrer le brouillon.</p>
                    <div className="ml-auto flex items-center gap-2 sm:gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-full px-4 py-2.5 text-sm text-muted hover:text-foreground">Annuler</button><button type="submit" disabled={pending} className="min-h-11 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent disabled:opacity-60">{pending ? "Création…" : "Créer le brouillon et continuer"}</button></div>
                  </div>
                </footer>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}

function Required() { return <span aria-hidden className="text-link">*</span>; }
function SectionTitle({ icon, title, help }: { icon: ReactNode; title: string; help: string }) {
  return <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface text-foreground">{icon}</span><div><h3 className="font-title text-[19px] leading-tight text-foreground">{title}</h3><p className="mt-1 text-xs leading-5 text-muted">{help}</p></div></div>;
}
function ContentCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="rounded-xl border border-border bg-surface p-4"><span className="text-muted">{icon}</span><strong className="mt-3 block text-sm text-foreground">{title}</strong><p className="mt-1 text-xs leading-5 text-muted">{text}</p></div>;
}
