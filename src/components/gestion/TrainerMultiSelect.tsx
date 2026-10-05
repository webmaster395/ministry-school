/* eslint-disable @next/next/no-img-element -- portraits issus du stockage Supabase */
"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import FormSubmitButton from "@/components/FormSubmitButton";
import { updateSessionTrainers } from "@/app/gestion/enseignement/preparation/trainers-actions";

export type TrainerChoice = { id: string; name: string; title: string | null; photoUrl: string | null };

function Avatar({ trainer }: { trainer: TrainerChoice }) {
  const initials = trainer.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-surface text-xs font-semibold text-muted">{trainer.photoUrl ? <img src={trainer.photoUrl} alt="" className="h-full w-full object-cover" /> : initials}</span>;
}

export default function TrainerMultiSelect({ sessionId, trainers, selectedIds }: { sessionId: string; trainers: TrainerChoice[]; selectedIds: string[] }) {
  const [query, setQuery] = useState("");
  const [checkedIds, setCheckedIds] = useState(() => new Set(selectedIds));
  const filtered = useMemo(() => trainers.filter((trainer) => trainer.name.toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr"))), [query, trainers]);
  const selected = trainers.filter((trainer) => checkedIds.has(trainer.id));

  return (
    <form action={updateSessionTrainers} className="space-y-4">
      <input type="hidden" name="session_id" value={sessionId} />
      {[...checkedIds].map((id) => <input key={id} type="hidden" name="trainer_ids" value={id} />)}
      {selected.length > 0 && <div className="flex items-center gap-3"><div className="flex -space-x-2">{selected.map((trainer) => <span key={trainer.id} className="rounded-full border-2 border-background"><Avatar trainer={trainer} /></span>)}</div><p className="text-sm text-muted">{selected.map((trainer) => trainer.name).join(" · ")}</p></div>}
      <label className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3"><Search size={17} className="text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un formateur" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" /></label>
      <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
        {filtered.map((trainer) => <label key={trainer.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-surface"><input type="checkbox" checked={checkedIds.has(trainer.id)} onChange={(event) => setCheckedIds((current) => { const next = new Set(current); if (event.target.checked) next.add(trainer.id); else next.delete(trainer.id); return next; })} className="h-4 w-4 accent-[var(--accent)]" /><Avatar trainer={trainer} /><span className="min-w-0"><strong className="block truncate text-sm text-foreground">{trainer.name}</strong>{trainer.title && <small className="block truncate text-muted">{trainer.title}</small>}</span></label>)}
        {!filtered.length && <p className="p-4 text-center text-sm text-muted">Aucun formateur trouvé.</p>}
      </div>
      <FormSubmitButton className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent" label="Enregistrer les formateurs" />
    </form>
  );
}
