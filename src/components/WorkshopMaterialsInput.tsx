"use client";

import { Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

const SUGGESTIONS = ["Écran", "Paperboard", "Stylos", "Feutres", "Papier"];

export default function WorkshopMaterialsInput({ initialValue = "", onDirty }: { initialValue?: string | null; onDirty?: () => void }) {
  const initial = useMemo(() => (initialValue ?? "").split("\n").map((item) => item.trim()).filter(Boolean), [initialValue]);
  const [items, setItems] = useState(initial);
  const [custom, setCustom] = useState("");
  const toggle = (item: string) => {
    setItems((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]);
    onDirty?.();
  };
  const addCustom = () => {
    const value = custom.trim();
    if (!value) return;
    setItems((current) => current.some((item) => item.toLocaleLowerCase("fr-FR") === value.toLocaleLowerCase("fr-FR")) ? current : [...current, value]);
    setCustom("");
    onDirty?.();
  };

  return (
    <fieldset className="rounded-2xl border border-border bg-surface/50 p-4 sm:p-5">
      <input type="hidden" name="organization_material_present" value="1" />
      <legend className="px-1 text-sm font-semibold text-foreground">Matériel nécessaire à l’organisation (facultatif)</legend>
      <p className="mb-3 text-xs leading-5 text-muted">Informations internes réservées aux super administrateurs. Elles ne sont jamais affichées aux participants.</p>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((item) => {
          const selected = items.includes(item);
          return <button key={item} type="button" onClick={() => toggle(item)} aria-pressed={selected} className={`rounded-full border px-3 py-2 text-sm transition ${selected ? "border-accent bg-accent text-on-accent" : "border-border bg-background hover:border-foreground"}`}>{item}</button>;
        })}
      </div>
      <div className="mt-3 flex gap-2">
        <input value={custom} onChange={(event) => setCustom(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustom(); } }} placeholder="Autre besoin…" className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent" />
        <button type="button" onClick={addCustom} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-foreground px-3 text-sm font-medium"><Plus size={16} /> Ajouter</button>
      </div>
      {items.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{items.map((item) => <span key={item} className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-xs ring-1 ring-border">{item}<button type="button" onClick={() => toggle(item)} aria-label={`Retirer ${item}`}><X size={13} /></button><input type="hidden" name="organization_material_items" value={item} /></span>)}</div>}
    </fieldset>
  );
}
