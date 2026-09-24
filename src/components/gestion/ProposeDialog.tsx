"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Search, Trash2, X } from "lucide-react";
import { proposeOpportunity, searchProfiles, type ProposeState } from "@/app/gestion/actions";
import { AFTERNOON, longDateLabel } from "@/lib/program-dates";

const field = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-[15px] text-foreground";
const label = "mb-1.5 block text-[14px] text-muted";
const PLACES = ["MLK Studio", "MLK GP", "Autre"] as const;

/** Champ de recherche de personne avec suggestions en live. */
function PersonSearch({ name, label: labelText, placeholder = "Rechercher une personne" }: { name: string; label: string; placeholder?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; full_name: string }[]>([]);
  const [selected, setSelected] = useState<{ id: string; full_name: string } | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- vide les suggestions quand la saisie est trop courte
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await searchProfiles(query);
        setResults(r);
        setOpen(r.length > 0);
      } catch { setResults([]); }
    }, 250);
    return () => clearTimeout(t);
  }, [query, selected]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const choose = (p: { id: string; full_name: string }) => {
    setSelected(p);
    setQuery(p.full_name);
    setResults([]);
    setOpen(false);
  };

  const clear = () => { setSelected(null); setQuery(""); setResults([]); };

  return (
    <div ref={ref} className="relative">
      <span className={label}>{labelText}</span>
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); if (selected) setSelected(null); }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={`${field} pl-9 ${selected ? "pr-8" : ""}`}
          autoComplete="off"
        />
        {selected && (
          <button type="button" onClick={clear} aria-label="Effacer" className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted transition hover:text-foreground">
            <X size={14} />
          </button>
        )}
      </div>
      {/* Valeur cachée pour le form submit */}
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => choose(p)}
                className="w-full px-3 py-2.5 text-left text-[14px] text-foreground transition hover:bg-foreground/[0.06]"
              >
                {p.full_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Liste de lignes à saisir : ajouter, réordonner, supprimer (objectifs, prérequis). */
function LineList({ name, items, setItems, addLabel }: { name: string; items: string[]; setItems: (v: string[]) => void; addLabel: string }) {
  const move = (i: number, by: number) => {
    const next = [...items];
    const j = i + by;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  };
  return (
    <div className="space-y-2">
      {items.map((value, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            name={name}
            value={value}
            onChange={(e) => setItems(items.map((v, k) => (k === i ? e.target.value : v)))}
            className={field}
          />
          <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter" className="rounded-lg border border-border p-2.5 text-muted disabled:opacity-40">
            <ArrowUp size={16} />
          </button>
          <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Descendre" className="rounded-lg border border-border p-2.5 text-muted disabled:opacity-40">
            <ArrowDown size={16} />
          </button>
          <button
            type="button"
            onClick={() => setItems(items.length > 1 ? items.filter((_, k) => k !== i) : [""])}
            aria-label="Supprimer"
            className="rounded-lg border border-border p-2.5 text-foreground"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setItems([...items, ""])}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background py-2.5 text-[15px] text-foreground transition hover:border-foreground"
      >
        <Plus size={16} /> {addLabel}
      </button>
    </div>
  );
}

/**
 * « Nouvelle proposition » : la fenêtre pour proposer une formation de service ou un projet.
 * Les informations essentielles d'abord ; la fiche se complète ensuite.
 */
export default function ProposeDialog({
  kind,
  services,
  dates,
  details,
}: {
  kind: "formation" | "projet";
  services: { id: string; name: string }[];
  dates: string[];
  /** Objectifs et prérequis disponibles (option lue côté serveur) */
  details: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ProposeState, FormData>(proposeOpportunity, {});
  const [selected, setSelected] = useState<string[]>([]);
  const [place, setPlace] = useState<(typeof PLACES)[number]>("MLK Studio");
  const [objectives, setObjectives] = useState<string[]>([""]);
  const [none, setNone] = useState(true);
  const [prerequisites, setPrerequisites] = useState<string[]>([""]);
  /** Clé pour réinitialiser PersonSearch et les inputs après fermeture */
  const [dialogKey, setDialogKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && handleClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function handleClose() {
    setOpen(false);
    setSelected([]);
    setPlace("MLK Studio");
    setDialogKey((k) => k + 1);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-[15px] font-medium text-on-accent transition hover:bg-[#1b2221]"
      >
        <Plus size={16} strokeWidth={2} /> Proposer {kind === "projet" ? "un projet" : "une formation"}
      </button>

      {open && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
        >
          <form
            key={dialogKey}
            action={action}
            role="dialog"
            aria-modal="true"
            aria-label="Nouvelle proposition"
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[94dvh] w-full max-w-[680px] overflow-y-auto rounded-t-2xl bg-surface shadow-[0_20px_60px_rgba(0,0,0,0.25)] sm:rounded-2xl"
          >
            <input type="hidden" name="kind" value={kind} />

            {/* ── En-tête fixe ── */}
            <div className="border-b border-border bg-surface px-5 pb-4 pt-5 sm:px-7 sm:pt-7">
              <button type="button" onClick={handleClose} aria-label="Fermer" className="absolute right-4 top-4 rounded-md p-1.5 text-muted transition hover:bg-foreground/[0.06] hover:text-foreground">
                <X size={20} />
              </button>
              <h2 className="font-title text-[22px] leading-tight text-foreground">Nouvelle proposition</h2>
              <p className="mt-1.5 text-[14px] text-muted">Commencez par les informations essentielles. <span className="text-link">La fiche pourra être complétée ensuite.</span></p>
            </div>

            {/* ── Corps scrollable ── */}
            <div><div className="space-y-5 px-5 py-5 sm:px-7">

            <div>
              <label className={label} htmlFor="p-title">Titre *</label>
              <input id="p-title" name="title" required className={field} />
            </div>

            {kind === "projet" ? (
              /* ── Champs spécifiques projet ── */
              <>
                <div>
                  <label className={label} htmlFor="p-lead">Chef de projet principal *</label>
                  <input id="p-lead" name="organizer_label" required className={field} />
                </div>
                <PersonSearch name="referent_id" label="Référent du suivi *" />
              </>
            ) : (
              /* ── Champs spécifiques formation ── */
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={label} htmlFor="p-lead">Responsable principal *</label>
                  <input id="p-lead" name="organizer_label" required className={field} />
                </div>
                <div>
                  <label className={label} htmlFor="p-service">Service organisateur *</label>
                  <select id="p-service" name="service_id" required defaultValue="" className={field}>
                    <option value="">Choisir un service</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <fieldset className="rounded-xl border border-border p-4">
              <legend className="px-2 text-[14px] font-semibold text-foreground">Dates *</legend>
              <div className="mb-3 flex gap-4 text-[14px]">
                <button type="button" onClick={() => setSelected(dates)} className="text-foreground underline underline-offset-2">Tout sélectionner</button>
                <button type="button" onClick={() => setSelected([])} className="text-foreground underline underline-offset-2">Effacer la sélection</button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {dates.map((d) => (
                  <label key={d} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-[14px] text-foreground">
                    <input
                      type="checkbox"
                      name="date"
                      value={d}
                      checked={selected.includes(d)}
                      onChange={(e) => setSelected(e.target.checked ? [...selected, d] : selected.filter((x) => x !== d))}
                      className="h-4 w-4"
                    />
                    {longDateLabel(d)}
                  </label>
                ))}
              </div>
              <p className="mt-3 text-[14px] text-muted">
                Horaire fixe : <strong className="text-foreground">{AFTERNOON.label}</strong>
              </p>
            </fieldset>

            <div>
              <span className={label}>Lieu *</span>
              <div className="grid grid-cols-3 gap-2">
                {PLACES.map((p) => (
                  <label key={p} className={`cursor-pointer rounded-lg border py-2.5 text-center text-[15px] transition ${place === p ? "border-foreground bg-accent text-on-accent" : "border-border bg-background text-foreground"}`}>
                    <input type="radio" name="place" value={p} checked={place === p} onChange={() => setPlace(p)} className="sr-only" />
                    {p}
                  </label>
                ))}
              </div>
              {place === "Autre" && <input name="place_other" required placeholder="Précisez le lieu" className={`${field} mt-2`} />}
            </div>

            <div className="sm:max-w-[60%]">
              <label className={label} htmlFor="p-room">Salle</label>
              <p className="-mt-1 mb-1.5 text-[12px] text-muted">Facultatif</p>
              <input id="p-room" name="room" className={field} />
            </div>

            <div>
              <label className={label} htmlFor="p-capacity">Capacité maximale *</label>
              <p className="-mt-1 mb-1.5 text-[12px] text-muted">Nombre maximal d&apos;inscrits</p>
              <input id="p-capacity" name="capacity" type="number" min={1} required className={field} />
            </div>

            <div>
              <label className={label} htmlFor="p-desc">Présentation *</label>
              <p className="-mt-1 mb-1.5 text-[12px] text-muted">Présentez en quelques lignes le contenu, l&apos;intérêt et le déroulement de {kind === "projet" ? "ce projet" : "cette formation"}.</p>
              <textarea id="p-desc" name="description" rows={4} required className={field} />
            </div>

            {details && (
              <div className="space-y-4 border-t border-border pt-5">
                <div>
                  <span className="mb-2 block text-[15px] font-semibold text-foreground">Objectifs</span>
                  <LineList name="objective" items={objectives} setItems={setObjectives} addLabel="Ajouter un objectif" />
                </div>
                <label className="flex items-center gap-2.5 text-[15px] text-foreground">
                  <input type="checkbox" name="no_prerequisite" checked={none} onChange={(e) => setNone(e.target.checked)} className="h-4 w-4" />
                  Aucun prérequis
                </label>
                {!none && (
                  <div>
                    <span className="mb-2 block text-[15px] font-semibold text-foreground">Prérequis</span>
                    <LineList name="prerequisite" items={prerequisites} setItems={setPrerequisites} addLabel="Ajouter un prérequis" />
                  </div>
                )}
              </div>
            )}

            </div></div>
            {/* fin corps scrollable */}

            {/* ── Footer fixe ── */}
            <div className="space-y-3 border-t border-border px-5 py-4 sm:px-7">
              {state.error && (
                <p role="alert" className="rounded-lg border border-m-doctoral/30 bg-m-doctoral/10 px-3 py-2 text-[14px] text-link">{state.error}</p>
              )}
              <div className="flex flex-wrap justify-end gap-3">
                <button type="button" onClick={handleClose} disabled={pending} className="rounded-full border border-border bg-background px-5 py-2.5 text-[15px] text-foreground transition hover:border-foreground disabled:opacity-60">
                  Annuler
                </button>
                <button type="submit" name="intent" value="draft" disabled={pending} className="rounded-full border border-border bg-background px-5 py-2.5 text-[15px] text-foreground transition hover:border-foreground disabled:opacity-60">
                  Enregistrer comme brouillon
                </button>
                <button type="submit" name="intent" value="publish" disabled={pending} className="rounded-full bg-accent px-5 py-2.5 text-[15px] font-medium text-on-accent transition hover:bg-[#1b2221] disabled:opacity-60">
                  {pending ? "Enregistrement…" : `Publier ${kind === "projet" ? "le projet" : "la formation"}`}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
