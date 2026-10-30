"use client";

import { useTransition } from "react";
import { setOpportunityContributorAccess } from "@/app/etudiant/services/actions";

type Contributor = { user_id: string; full_name: string; can_edit: boolean };

export default function ContributorAccessEditor({ opportunityId, contributors }: { opportunityId: string; contributors: Contributor[] }) {
  const [pending, startTransition] = useTransition();
  if (!contributors.length) return <p className="text-sm text-muted">Aucun contributeur n’est actuellement affecté.</p>;
  return <ul className="divide-y divide-border-soft">{contributors.map((person) => <li key={person.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><span><strong className="block text-sm text-foreground">{person.full_name}</strong><small className="text-muted">{person.can_edit ? "Peut modifier" : "Lecture seule"}</small></span><button type="button" disabled={pending} onClick={() => startTransition(async () => { const form = new FormData(); form.set("opportunity_id", opportunityId); form.set("contributor_id", person.user_id); form.set("can_edit", person.can_edit ? "0" : "1"); await setOpportunityContributorAccess(form); })} className="rounded-full border border-border px-3.5 py-2 text-xs font-semibold text-foreground transition hover:border-foreground disabled:opacity-50">{person.can_edit ? "Passer en lecture seule" : "Autoriser la modification"}</button></li>)}</ul>;
}
