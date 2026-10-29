"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { replaceOpportunityAssignments } from "@/app/etudiant/services/actions";

type Member = { id: string; full_name: string; email: string };

export default function AssignmentEditor({ opportunityId, members, managers, contributors }: {
  opportunityId: string;
  members: Member[];
  managers: string[];
  contributors: string[];
}) {
  const [query, setQuery] = useState("");
  const [managerIds, setManagerIds] = useState(new Set(managers));
  const [contributorIds, setContributorIds] = useState(new Set(contributors));
  const shown = members.filter((member) => `${member.full_name} ${member.email}`.toLowerCase().includes(query.toLowerCase()));
  const toggle = (id: string, role: "manager" | "contributor", checked: boolean) => {
    const own = new Set(role === "manager" ? managerIds : contributorIds);
    if (checked) own.add(id); else own.delete(id);
    if (role === "manager") setManagerIds(own); else setContributorIds(own);
    if (checked) {
      const other = new Set(role === "manager" ? contributorIds : managerIds);
      other.delete(id);
      if (role === "manager") setContributorIds(other); else setManagerIds(other);
    }
  };
  return <details className="rounded-2xl border border-border bg-background p-5">
    <summary className="cursor-pointer font-medium">Gérer les responsables et contributeurs</summary>
    <form action={replaceOpportunityAssignments} className="mt-4">
      <input type="hidden" name="opportunity_id" value={opportunityId} />
      <label className="relative block max-w-lg"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un membre" className="w-full rounded-lg border border-border py-2.5 pl-9 pr-3 text-sm" /></label>
      <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-border">{shown.map((member) => <div key={member.id} className="grid gap-2 border-b border-border-soft px-4 py-3 last:border-0 sm:grid-cols-[1fr_auto_auto]"><span className="min-w-0 text-sm"><strong>{member.full_name}</strong><small className="ml-2 text-muted">{member.email}</small></span><label className="flex gap-2 text-sm"><input type="checkbox" checked={managerIds.has(member.id)} onChange={(event) => toggle(member.id, "manager", event.target.checked)} /> Responsable</label><label className="flex gap-2 text-sm"><input type="checkbox" checked={contributorIds.has(member.id)} onChange={(event) => toggle(member.id, "contributor", event.target.checked)} /> Contributeur</label></div>)}</div>
      {[...managerIds].map((id) => <input key={`manager-${id}`} type="hidden" name="manager_ids" value={id} />)}
      {[...contributorIds].map((id) => <input key={`contributor-${id}`} type="hidden" name="contributor_ids" value={id} />)}
      <button className="mt-4 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-on-accent">Enregistrer les affectations</button>
      <p className="mt-2 text-xs text-muted">Chaque nouveau membre ajouté reçoit une notification interne avec un lien vers la fiche.</p>
    </form>
  </details>;
}
