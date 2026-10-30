"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export type AdminSelectOption = { value: string; label: string; disabled?: boolean };

export default function AdminSelect({ name, value, defaultValue = "", onValueChange, options, placeholder = "Sélectionner", disabled = false, searchable, className = "", ariaLabel }: {
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: AdminSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const [internal, setInternal] = useState(defaultValue);
  const selectedValue = value ?? internal;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === selectedValue);
  const showSearch = searchable ?? options.length >= 8;
  const shown = useMemo(() => { const needle = query.trim().toLocaleLowerCase("fr-FR"); return needle ? options.filter((option) => option.label.toLocaleLowerCase("fr-FR").includes(needle)) : options; }, [options, query]);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, []);

  const choose = (next: string) => {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
    setOpen(false);
    setQuery("");
  };

  return <div ref={root} className={`relative ${className}`}>
    {name && <input type="hidden" name={name} value={selectedValue} />}
    <button type="button" disabled={disabled} aria-label={ariaLabel} aria-expanded={open} aria-controls={listId} onClick={() => setOpen((current) => !current)} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-3.5 text-left text-sm text-foreground outline-none transition hover:border-foreground focus:border-accent focus:ring-4 focus:ring-accent/10 disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted">
      <span className={`truncate ${selected ? "" : "text-muted"}`}>{selected?.label ?? placeholder}</span><ChevronDown size={16} className={`shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} />
    </button>
    {open && !disabled && <div id={listId} role="listbox" className="absolute z-50 mt-1.5 w-full min-w-[190px] overflow-hidden rounded-xl border border-border bg-background p-1.5 shadow-[0_16px_45px_rgba(20,30,28,.16)]">
      {showSearch && <label className="relative mb-1 block"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher…" className="min-h-9 w-full rounded-lg border border-border-soft bg-surface pl-8 pr-3 text-sm outline-none focus:border-accent" /></label>}
      <div className="max-h-64 overflow-y-auto overscroll-contain">{shown.map((option) => <button key={option.value} type="button" role="option" aria-selected={option.value === selectedValue} disabled={option.disabled} onClick={() => choose(option.value)} className="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm transition hover:bg-surface disabled:opacity-40"><span className="truncate">{option.label}</span>{option.value === selectedValue && <Check size={15} className="shrink-0" />}</button>)}{shown.length === 0 && <p className="px-3 py-4 text-center text-xs text-muted">Aucun résultat</p>}</div>
    </div>}
  </div>;
}
