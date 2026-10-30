import { CalendarClock, CheckCircle2, Clock3, MessageSquareWarning, Send } from "lucide-react";
import { submitOpportunityReview } from "@/app/etudiant/services/actions";
import type { OpportunityReviewState } from "@/lib/data/opportunity-review";

const parisDate = (value: string) => new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris",
}).format(new Date(value));

/** Suivi opérationnel : aucune action de validation ou de publication n'est exposée ici. */
export default function OpportunitySubmissionPanel({ opportunityId, state, canSubmit }: {
  opportunityId: string;
  state: OpportunityReviewState;
  canSubmit: boolean;
}) {
  const pending = state.status === "pending";
  const corrections = state.status === "changes_requested";
  const approved = state.status === "approved";
  const canSubmitRevision = approved && state.hasDraftRevision;
  return <section id="suivi-validation" className="scroll-mt-24 rounded-3xl border border-border bg-background p-5 sm:p-7">
    <div className="flex items-start gap-3">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${corrections ? "bg-rose-100 text-rose-800" : approved ? "bg-emerald-100 text-emerald-800" : "bg-surface text-muted"}`}>{corrections ? <MessageSquareWarning size={19} /> : approved ? <CheckCircle2 size={19} /> : <Clock3 size={19} />}</span>
      <div><p className="label text-xs tracking-[.14em] text-muted">SUIVI DE LA VALIDATION</p><h2 className="font-title mt-1 text-[23px]">{pending ? "En attente d’une décision" : corrections ? "Corrections à apporter" : canSubmitRevision ? "Nouvelle version à soumettre" : approved ? "Fiche validée" : "Prête à être soumise ?"}</h2><p className="mt-1 text-sm leading-relaxed text-muted">{pending ? `Soumise${state.requestedAt ? ` le ${parisDate(state.requestedAt)}` : ""}. La publication sera décidée par un super administrateur.` : corrections ? "Consultez les indications ci-dessous, enregistrez vos corrections puis soumettez à nouveau." : canSubmitRevision ? "Vos changements sont enregistrés sans modifier la version actuellement publiée. Soumettez-les lorsque la nouvelle version est prête." : approved ? "La décision de publication est visible ci-dessous. Elle ne peut pas être modifiée depuis cet espace." : "Enregistrez d’abord votre brouillon, puis transmettez la fiche aux super administrateurs."}</p></div>
    </div>

    {corrections && state.correctionMessage && <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-950"><strong className="mb-1 block">Corrections demandées</strong>{state.correctionMessage}</div>}

    {approved && state.decidedAt && <dl className="mt-5 grid gap-3 rounded-2xl bg-surface p-4 text-sm sm:grid-cols-2"><div><dt className="text-muted">Décision</dt><dd className="mt-1 font-semibold">Validée par {state.decidedByName || "un super administrateur"}</dd></div><div><dt className="text-muted">Date de décision</dt><dd className="mt-1 font-semibold">{parisDate(state.decidedAt)}</dd></div>{state.desiredPublishedAt && <div className="sm:col-span-2"><dt className="text-muted">Publication</dt><dd className="mt-1 inline-flex items-center gap-2 font-semibold"><CalendarClock size={16} /> {state.desiredPublicationStatus === "scheduled" ? `Programmée le ${parisDate(state.desiredPublishedAt)}` : `Publiée le ${parisDate(state.desiredPublishedAt)}`}</dd></div>}</dl>}

    {canSubmit && (state.status === "none" || corrections || canSubmitRevision) && <form action={submitOpportunityReview} className="mt-5 border-t border-border-soft pt-5"><input type="hidden" name="opportunity_id" value={opportunityId} /><button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-on-accent"><Send size={16} /> {corrections ? "Soumettre à nouveau" : canSubmitRevision ? "Soumettre la nouvelle version" : "Soumettre à validation"}</button><p className="mt-2 text-xs text-muted">Cette action ne publie rien : elle transmet la fiche à la Super administration.</p></form>}
  </section>;
}
