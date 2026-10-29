import { CheckCircle2, Clock3, History, MessageSquareWarning, Send } from "lucide-react";
import type { MinistryCourseReviewState } from "@/lib/data/ministry-course-review";
import {
  addMinistryCourseAnnotation,
  decideMinistryCourseReview,
  submitMinistryCourseReview,
} from "@/app/gestion/a-valider/actions";

const LABELS: Record<MinistryCourseReviewState["status"], string> = {
  draft: "Brouillon",
  pending: "En attente de validation",
  changes_requested: "À corriger",
  scheduled: "Publication programmée",
  published: "Publié",
  superseded: "Version remplacée",
};

const parisDate = (value: string) => new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris",
}).format(new Date(value));

export default function MinistryCourseReviewPanel({ sessionId, state }: { sessionId: string; state: MinistryCourseReviewState }) {
  const unresolved = state.annotations.filter((annotation) => annotation.requiresAction && !annotation.resolvedAt);
  return <section className="space-y-4 rounded-3xl border border-border bg-background p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="label text-[11px] tracking-[.14em] text-muted">CIRCUIT ÉDITORIAL</p><h2 className="font-title mt-1 text-[22px]">{LABELS[state.status]}</h2><p className="mt-1 text-sm text-muted">La validation du cours reste distincte des dates de disponibilité de sa vidéo, de ses supports et de ses devoirs.</p></div>
      {state.publicationAt && <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-2 text-xs text-muted"><Clock3 size={14} /> {parisDate(state.publicationAt)}</span>}
    </div>

    {unresolved.length > 0 && <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4"><p className="flex items-center gap-2 text-sm font-semibold text-amber-950"><MessageSquareWarning size={17} /> Corrections attendues</p><ul className="mt-3 space-y-2 text-sm text-amber-950">{unresolved.map((annotation) => <li key={annotation.id}><strong>{annotation.authorName}</strong> · {annotation.body}</li>)}</ul></div>}

    {state.annotations.length > 0 && <details className="rounded-2xl bg-surface p-4"><summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold"><History size={16} /> Historique privé ({state.annotations.length})</summary><ol className="mt-3 space-y-3 border-l border-border pl-4">{state.annotations.map((annotation) => <li key={annotation.id} className="text-sm"><p className="text-foreground">{annotation.body}</p><p className="mt-1 text-xs text-muted">{annotation.authorName} · {parisDate(annotation.createdAt)}{annotation.resolvedAt ? " · traité" : annotation.requiresAction ? " · à traiter" : ""}</p></li>)}</ol></details>}

    {state.canSubmit && (state.status === "draft" || state.status === "changes_requested") && <form action={submitMinistryCourseReview} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E9B85D]/55 bg-[#FFF8E7] p-4"><input type="hidden" name="session_id" value={sessionId} /><p className="max-w-2xl text-sm text-muted">Soumettez la version terminée à Flora et Nathalie. Une seule de leurs validations suffit, mais vous ne pouvez pas publier vous-même.</p><button className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-on-accent"><Send size={16} /> Soumettre à validation</button></form>}

    {state.canDecide && state.status === "pending" && <div className="grid gap-4 border-t border-border-soft pt-5 lg:grid-cols-2">
      <form action={decideMinistryCourseReview} className="rounded-2xl border border-amber-300 bg-amber-50/60 p-4"><input type="hidden" name="session_id" value={sessionId} /><input type="hidden" name="decision" value="changes_requested" /><label className="text-sm font-semibold text-amber-950">Demander des corrections</label><textarea required name="message" rows={4} placeholder="Indiquez précisément les éléments à reprendre…" className="mt-3 w-full rounded-xl border border-amber-200 bg-white p-3 text-sm outline-none focus:border-amber-500" /><button className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-400 px-4 py-2.5 text-sm font-semibold text-amber-950"><MessageSquareWarning size={16} /> Renvoyer au responsable</button></form>
      <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4"><form action={decideMinistryCourseReview}><input type="hidden" name="session_id" value={sessionId} /><input type="hidden" name="decision" value="approve" /><input type="hidden" name="publish_mode" value="now" /><button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white"><CheckCircle2 size={17} /> Valider et publier maintenant</button></form><form action={decideMinistryCourseReview} className="rounded-xl bg-white p-3"><input type="hidden" name="session_id" value={sessionId} /><input type="hidden" name="decision" value="approve" /><input type="hidden" name="publish_mode" value="scheduled" /><label className="text-xs font-semibold text-emerald-950">Valider et programmer (heure de Paris)</label><input required type="datetime-local" name="publication_at" className="mt-2 w-full rounded-lg border border-emerald-200 px-3 py-2.5 text-sm" /><button className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-500 px-4 py-2 text-xs font-semibold text-emerald-900"><Clock3 size={15} /> Valider la programmation</button></form></div>
    </div>}

    {(state.canDecide || state.canSubmit) && <form action={addMinistryCourseAnnotation} className="grid gap-2 border-t border-border-soft pt-4 sm:grid-cols-[1fr_auto] sm:items-end"><input type="hidden" name="session_id" value={sessionId} /><label><span className="mb-1 block text-xs font-medium text-muted">Ajouter un commentaire privé</span><textarea required name="body" rows={2} className="w-full rounded-xl border border-border bg-surface p-3 text-sm" placeholder="Visible uniquement par l’équipe autorisée…" /></label><button className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold">Ajouter</button></form>}
  </section>;
}
