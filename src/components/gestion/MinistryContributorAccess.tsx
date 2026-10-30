"use client";

import { useTransition } from "react";
import { setMinistryContributorAccess } from "@/app/gestion/pilotage/actions";

export default function MinistryContributorAccess({ ministryId, contributors }: {
  ministryId: string;
  contributors: { user_id: string; full_name: string; can_edit: boolean }[];
}) {
  const [pending, startTransition] = useTransition();
  if (!contributors.length) return <p className="text-sm text-muted">Aucun contributeur n’est actuellement affecté par la Super administration.</p>;
  return <ul className="divide-y divide-border-soft">{contributors.map((person) => <li key={person.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><span><strong className="block text-sm">{person.full_name}</strong><small className="text-muted">{person.can_edit ? "Peut modifier" : "Lecture seule"}</small></span><button type="button" disabled={pending} onClick={() => startTransition(async () => { const data = new FormData(); data.set("ministry_id", ministryId); data.set("contributor_id", person.user_id); data.set("can_edit", person.can_edit ? "0" : "1"); await setMinistryContributorAccess(data); })} className="rounded-full border border-border px-3.5 py-2 text-xs font-semibold transition hover:border-foreground disabled:opacity-50">{person.can_edit ? "Passer en lecture seule" : "Autoriser la modification"}</button></li>)}</ul>;
}
