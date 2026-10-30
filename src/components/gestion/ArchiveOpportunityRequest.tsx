import { requestOpportunityArchive } from "@/app/etudiant/services/actions";

export default function ArchiveOpportunityRequest({ opportunityId, requested }: { opportunityId: string; requested: boolean }) {
  if (requested) return <p className="rounded-xl bg-surface px-4 py-3 text-sm text-muted">Une demande d’archivage a déjà été transmise à la Super administration.</p>;
  return <form action={requestOpportunityArchive}><input type="hidden" name="opportunity_id" value={opportunityId} /><button className="rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-foreground">Demander l’archivage</button></form>;
}
