"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";

type MinistryChoice = { id: string; slug: string; name: string };
export type MemberFilterValues = {
  q: string;
  role: string;
  sens: string;
  statut: string;
  implication: string;
  genre: string;
  tri: string;
  par: string;
};

const field = "min-h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-foreground";
const ROLE_LABELS: Record<string, string> = { etudiant: "Étudiant", enseignant: "Formateur", chef: "Chef de projet", responsable: "Responsable de service", pilotage: "Pilotage ministériel", admin: "Admin" };
const STATUS_LABELS: Record<string, string> = { actif: "Actif", a_confirmer: "À confirmer", desactive: "Désactivé" };
const IMPLICATION_LABELS: Record<string, string> = { aucun: "Aucun engagement", equipier: "Équipier MLK", manager: "Manager", collaborateur: "Collaborateur", non_renseigne: "Non renseignée" };
const GENDER_LABELS: Record<string, string> = { homme: "Hommes", femme: "Femmes", non_renseigne: "Non renseigné" };

export default function MemberFilters({ initial, ministries }: { initial: MemberFilterValues; ministries: MinistryChoice[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [values, setValues] = useState(initial);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ministryLabels = new Map(ministries.map((item) => [item.slug, item.name]));

  const active = [
    values.role !== "tous" && { key: "role", label: `Rôle : ${ROLE_LABELS[values.role] ?? values.role}`, reset: "tous" },
    values.statut !== "tous" && { key: "statut", label: `Statut : ${STATUS_LABELS[values.statut] ?? values.statut}`, reset: "tous" },
    values.sens !== "toutes" && { key: "sens", label: `Sensibilité : ${values.sens === "non_renseignee" ? "Non renseignée" : ministryLabels.get(values.sens) ?? values.sens}`, reset: "toutes" },
    values.implication !== "toutes" && { key: "implication", label: `Implication : ${IMPLICATION_LABELS[values.implication] ?? values.implication}`, reset: "toutes" },
    values.genre !== "tous" && { key: "genre", label: `Genre : ${GENDER_LABELS[values.genre] ?? values.genre}`, reset: "tous" },
  ].filter(Boolean) as { key: keyof MemberFilterValues; label: string; reset: string }[];

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", close);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", close); };
  }, [open]);

  function apply(next: MemberFilterValues) {
    const qs = new URLSearchParams({ onglet: "membres", ...next, page: "1" });
    startTransition(() => router.replace(`${pathname}?${qs.toString()}`, { scroll: false }));
  }

  function change(key: keyof MemberFilterValues, value: string, immediate = true) {
    const next = { ...values, [key]: value };
    setValues(next);
    if (!immediate) return;
    if (timer.current) clearTimeout(timer.current);
    if (key === "q") timer.current = setTimeout(() => apply(next), 300);
    else apply(next);
  }

  function reset(key: keyof MemberFilterValues, value: string) {
    const next = { ...values, [key]: value };
    setValues(next);
    apply(next);
  }

  function clearAll() {
    const next = { ...values, role: "tous", statut: "tous", sens: "toutes", implication: "toutes", genre: "tous" };
    setValues(next);
    apply(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="relative min-w-[220px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" value={values.q} onChange={(event) => change("q", event.target.value)} placeholder="Rechercher par nom ou e-mail" autoComplete="off" className={`${field} w-full pl-9 pr-9`} />
          {pending && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted" aria-label="Recherche en cours" />}
        </label>
        <select name="role" value={values.role} onChange={(event) => change("role", event.target.value)} className={`${field} min-w-[150px]`} aria-label="Rôle">
          <option value="tous">Tous les rôles</option><option value="etudiant">Étudiant seulement</option><option value="enseignant">Formateur</option><option value="chef">Chef de projet</option><option value="responsable">Responsable de service</option><option value="pilotage">Pilotage ministériel</option><option value="admin">Admin</option>
        </select>
        <select name="statut" value={values.statut} onChange={(event) => change("statut", event.target.value)} className={`${field} min-w-[145px]`} aria-label="Statut">
          <option value="tous">Tous les statuts</option><option value="actif">Actif</option><option value="a_confirmer">À confirmer</option><option value="desactive">Désactivé</option>
        </select>
        <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-3.5 text-sm font-medium text-foreground transition hover:border-foreground/40">
          <SlidersHorizontal size={16} /> Filtres{active.length ? ` · ${active.length}` : ""}
        </button>
      </div>

      {active.length > 0 && <div className="flex flex-wrap items-center gap-2" aria-label="Filtres actifs">
        {active.map((filter) => <button type="button" key={filter.key} onClick={() => reset(filter.key, filter.reset)} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-border-soft">{filter.label}<X size={13} /></button>)}
        <button type="button" onClick={clearAll} className="ml-1 text-xs font-medium text-muted underline underline-offset-4 hover:text-foreground">Tout effacer</button>
      </div>}

      <div className={open ? "fixed inset-0 z-50" : "hidden"}>
        <button type="button" aria-label="Fermer les filtres" onClick={() => setOpen(false)} className="absolute inset-0 bg-foreground/35 backdrop-blur-[1px]" />
        <aside role="dialog" aria-modal="true" aria-labelledby="member-filter-title" className="absolute inset-y-0 right-0 flex w-full flex-col bg-background shadow-2xl sm:w-[430px]">
          <header className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
            <div><p className="label text-[10px] tracking-[0.16em] text-muted">MEMBRES</p><h2 id="member-filter-title" className="font-title mt-1 text-[24px] text-foreground">Tous les filtres</h2></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-surface hover:text-foreground"><X size={20} /></button>
          </header>
          <div className="flex-1 space-y-7 overflow-y-auto px-5 py-6 sm:px-6">
            <fieldset className="space-y-4">
              <legend className="label mb-3 text-[11px] tracking-[0.14em] text-muted">PROFIL ÉTUDIANT</legend>
              <label className="block space-y-1.5 text-sm">Sensibilité<select name="sens" value={values.sens} onChange={(event) => change("sens", event.target.value, false)} className={`${field} w-full`}><option value="toutes">Toutes les sensibilités</option><option value="non_renseignee">Non renseignée</option>{ministries.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label>
              <label className="block space-y-1.5 text-sm">Implication à MLK<select name="implication" value={values.implication} onChange={(event) => change("implication", event.target.value, false)} className={`${field} w-full`}><option value="toutes">Toutes les implications</option><option value="aucun">Aucun engagement</option><option value="equipier">Équipiers MLK</option><option value="manager">Managers et adjoints</option><option value="collaborateur">Collaborateurs salariés</option><option value="non_renseigne">Non renseignée</option></select></label>
              <label className="block space-y-1.5 text-sm">Genre<select name="genre" value={values.genre} onChange={(event) => change("genre", event.target.value, false)} className={`${field} w-full`}><option value="tous">Tous les genres</option><option value="homme">Hommes</option><option value="femme">Femmes</option><option value="non_renseigne">Non renseigné</option></select></label>
            </fieldset>
            <fieldset className="grid gap-4 border-t border-border-soft pt-6 sm:grid-cols-2">
              <legend className="label mb-3 text-[11px] tracking-[0.14em] text-muted sm:col-span-2">AFFICHAGE</legend>
              <label className="block space-y-1.5 text-sm">Trier<select name="tri" value={values.tri} onChange={(event) => change("tri", event.target.value, false)} className={`${field} w-full`}><option value="nom">Par nom</option><option value="creation">Plus récents</option></select></label>
              <label className="block space-y-1.5 text-sm">Par page<select name="par" value={values.par} onChange={(event) => change("par", event.target.value, false)} className={`${field} w-full`}><option value="25">25 membres</option><option value="50">50 membres</option><option value="100">100 membres</option></select></label>
            </fieldset>
          </div>
          <footer className="flex items-center justify-between gap-3 border-t border-border bg-background px-5 py-4 sm:px-6">
            {active.length ? <button type="button" onClick={clearAll} className="text-sm text-muted underline underline-offset-4">Tout effacer</button> : <span />}
            <button type="button" onClick={() => { apply(values); setOpen(false); }} className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent">Appliquer les filtres</button>
          </footer>
        </aside>
      </div>
    </div>
  );
}
