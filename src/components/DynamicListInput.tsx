"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

export default function DynamicListInput({
  name,
  label,
  initialValue = "",
  placeholder,
  required = false,
  onDirty,
}: {
  name: string;
  label: string;
  initialValue?: string | null;
  placeholder: string;
  required?: boolean;
  onDirty?: () => void;
}) {
  const initial = (initialValue ?? "").split("\n").map((value) => value.trim()).filter(Boolean);
  const [items, setItems] = useState(initial.length ? initial : [""]);
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const update = (index: number, value: string) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));
    onDirty?.();
  };
  const add = (after = items.length - 1) => {
    setItems((current) => [...current.slice(0, after + 1), "", ...current.slice(after + 1)]);
    onDirty?.();
    requestAnimationFrame(() => refs.current[after + 1]?.focus());
  };
  const remove = (index: number) => {
    setItems((current) => current.length === 1 ? [""] : current.filter((_, i) => i !== index));
    onDirty?.();
  };
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    setItems((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    onDirty?.();
  };
  const hasValue = items.some((item) => item.trim().length > 0);

  return (
    <fieldset className="min-w-0 max-w-full rounded-2xl border border-border bg-surface/50 p-4">
      <legend className="px-1 text-sm font-semibold text-foreground">{label}{required ? " *" : ""}</legend>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-lg text-muted">•</span>
            <input
              ref={(node) => { refs.current[index] = node; }}
              name={name}
              value={item}
              onChange={(event) => update(index, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") { event.preventDefault(); add(index); }
              }}
              placeholder={placeholder}
              required={required && index === 0 && !hasValue}
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
            />
            <div className="hidden items-center sm:flex">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Monter" className="p-1.5 text-muted disabled:opacity-20"><ArrowUp size={14} /></button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label="Descendre" className="p-1.5 text-muted disabled:opacity-20"><ArrowDown size={14} /></button>
            </div>
            <button type="button" onClick={() => remove(index)} aria-label="Supprimer" className="p-2 text-muted hover:text-red-700"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => add()} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
        <Plus size={15} /> Ajouter un élément
      </button>
      <p className="mt-2 text-xs text-muted">Entrée ajoute directement la ligne suivante.</p>
    </fieldset>
  );
}

