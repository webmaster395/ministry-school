"use client";

import { useMemo, useState } from "react";
import { Check, Search, UserPlus } from "lucide-react";
import { addUserListMembers } from "@/app/gestion/admin/list-actions";

type Member = { id: string; name: string; email: string };

export default function ListMemberPicker({ listId, members }: { listId: string; members: Member[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const needle = query.trim().toLocaleLowerCase("fr-FR");
  const shown = useMemo(() => needle ? members.filter((member) => `${member.name} ${member.email}`.toLocaleLowerCase("fr-FR").includes(needle)) : members, [members, needle]);
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return <form action={addUserListMembers} className="rounded-2xl border border-border bg-background p-4 sm:p-5">
    <input type="hidden" name="list_id" value={listId} />
    {selected.map((id) => <input key={id} type="hidden" name="member_ids" value={id} />)}
    <h3 className="text-sm font-semibold">Ajouter des membres</h3>
    <label className="relative mt-3 block"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher par nom ou e-mail" className="min-h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-foreground" /></label>
    <div className="mt-3 max-h-72 space-y-2 overflow-y-auto overscroll-contain">
      {shown.map((member) => { const active = selected.includes(member.id); return <button type="button" key={member.id} onClick={() => toggle(member.id)} aria-pressed={active} className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 text-left ${active ? "border-foreground bg-surface" : "border-border-soft"}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${active ? "bg-foreground text-on-accent" : "bg-surface text-muted"}`}>{active ? <Check size={15} /> : member.name.charAt(0).toUpperCase()}</span><span className="min-w-0"><strong className="block truncate text-sm">{member.name || "Sans nom"}</strong><small className="block truncate text-muted">{member.email}</small></span></button>; })}
      {shown.length === 0 && <p className="py-6 text-center text-sm text-muted">Aucune personne disponible.</p>}
    </div>
    <button disabled={!selected.length} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-on-accent disabled:opacity-40"><UserPlus size={16} /> Ajouter {selected.length || ""} personne{selected.length > 1 ? "s" : ""}</button>
  </form>;
}

