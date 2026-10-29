import { Check, CheckCircle2, Clock3, Eye, MessageSquareWarning, Send } from "lucide-react";
import { decideOpportunityReview, requestOpportunityContribution } from "@/app/etudiant/services/actions";
import type { OpportunityReviewState } from "@/lib/data/opportunity-review";

const parisDate = (value: string) => new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Paris",
}).format(new Date(value));

function Approval({ name, approved }: { name: string; approved: boolean }) {
  return <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${approved ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-border bg-background text-muted"}`}>{approved ? <CheckCircle2 size={17} /> : <Clock3 size={17} />}<span><strong className="font-semibold">{name}</strong><small className="ml-1.5">{approved ? "a validé" : "en attente"}</small></span></div>;
}

export default function OpportunityReviewPanel({ opportunityId, state, canManage }: { opportunityId: string; state: OpportunityReviewState; canManage: boolean }) {
  const active = state.status === "pending" || state.status === "changes_requested" || state.status === "approved";
  return <section className="space-y-4">
    {active && <div className={`rounded-3xl border p-5 sm:p-6 ${state.status === "changes_requested" ? "border-amber-300 bg-amber-50/80" : state.status === "approved" ? "border-emerald-200 bg-emerald-50/70" : "border-[#E9B85D]/55 bg-[#FFF8E7]"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${state.status === "changes_requested" ? "bg-amber-500 text-white" : state.status === "approved" ? "bg-emerald-600 text-white" : "bg-[#F4A12A] text-white"}`}>{state.status === "changes_requested" ? <MessageSquareWarning size={20} /> : state.status === "approved" ? <CheckCircle2 size={20} /> : <Clock3 size={20} />}</span>
          <div><h2 className="font-title text-[21px]">{state.status === "changes_requested" ? "Corrections demandées" : state.status === "approved" ? "Validation terminée" : "Validation avant publication"}</h2><p className="mt-1 text-sm leading-relaxed text-muted">{state.status === "changes_requested" ? "La fiche reste invisible des étudiants jusqu’à une nouvelle demande de validation." : state.status === "approved" ? "Une validation a été recueillie. La publication demandée est activée." : `Publication ${state.desiredPublicationStatus === "scheduled" && state.desiredPublishedAt ? `programmée au ${parisDate(state.desiredPublishedAt)}` : "immédiate"} dès la validation de Nathalie ou Flora.`}</p></div>
        </div>
        {state.isObserver && <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-muted"><Eye size={14} /> Aperçu uniquement</span>}
      </div>

      {state.status === "pending" && <div className="mt-5 grid gap-2 sm:grid-cols-2"><Approval name="Nathalie Boudehent" approved={state.nathalieApproved} /><Approval name="Flora Demerle" approved={state.floraApproved} /></div>}

      {state.status === "changes_requested" && state.correctionMessage && <div className="mt-5 rounded-2xl border border-amber-300 bg-white px-4 py-4 text-sm leading-relaxed text-amber-950"><strong className="mb-1 block">Modifications attendues</strong>{state.correctionMessage}</div>}

      {state.canDecide && state.status === "pending" && <div className="mt-5 grid gap-4 border-t border-[#E9B85D]/40 pt-5 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start">
        <form action={decideOpportunityReview}>
          <input type="hidden" name="opportunity_id" value={opportunityId} />
          <input type="hidden" name="decision" value="approve" />
          <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 lg:w-auto"><Check size={17} /> Valider ce rendu</button>
        </form>
        <form action={decideOpportunityReview} className="rounded-2xl border border-amber-300 bg-white p-3">
          <input type="hidden" name="opportunity_id" value={opportunityId} />
          <input type="hidden" name="decision" value="changes_requested" />
          <label className="block text-xs font-semibold text-amber-950">Demander des corrections</label>
          <textarea name="message" required rows={3} placeholder="Décrivez précisément les éléments à corriger ou compléter…" className="mt-2 w-full resize-y rounded-xl border border-amber-200 bg-amber-50/40 p-3 text-sm outline-none focus:border-amber-500" />
          <button className="mt-2 inline-flex items-center gap-2 rounded-full border border-amber-400 px-4 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-50"><MessageSquareWarning size={15} /> Envoyer la demande</button>
        </form>
      </div>}
    </div>}

    {canManage && <details className="rounded-2xl border border-border bg-background p-5"><summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold"><Send size={16} /> Demander un complément à l’équipe</summary><ContributionForm opportunityId={opportunityId} /></details>}
  </section>;
}

function ContributionForm({ opportunityId }: { opportunityId: string }) {
  return <form action={requestOpportunityContribution} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><input type="hidden" name="opportunity_id" value={opportunityId} /><label className="block"><span className="mb-1.5 block text-xs font-medium text-muted">Informations ou ajouts attendus</span><textarea name="message" required rows={3} placeholder="Ex. Merci de compléter les prérequis et de confirmer le matériel…" className="w-full resize-y rounded-xl border border-border bg-surface p-3 text-sm outline-none focus:border-foreground" /></label><button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-on-accent"><Send size={16} /> Notifier l’équipe</button></form>;
}
