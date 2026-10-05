"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";

const field = "rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground";

export type MemberFilterValues = {
  q: string;
  role: string;
  sens: string;
  statut: string;
  implication: string;
  genre: string;
  par: string;
  tri: string;
};

/**
 * Recherche et filtres des membres : la liste se met à jour toute seule, environ 0,3 s après la
 * dernière lettre tapée, et tout de suite quand on change un menu. La page revient à la première
 * page à chaque changement ; le reste (tri, nombre par page) est conservé.
 */
export default function MemberFilters({
  initial,
  ministries,
}: {
  initial: MemberFilterValues;
  ministries: { id: string; name: string; slug: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [values, setValues] = useState(initial);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function apply(next: MemberFilterValues) {
    const qs = new URLSearchParams({ onglet: "membres", ...next });
    startTransition(() => router.replace(`${pathname}?${qs.toString()}`, { scroll: false }));
  }

  function change(key: keyof MemberFilterValues, value: string) {
    const next = { ...values, [key]: value };
    setValues(next);
    if (timer.current) clearTimeout(timer.current);
    if (key === "q") timer.current = setTimeout(() => apply(next), 300);
    else apply(next);
  }

  const select = (name: keyof MemberFilterValues, label: string, children: React.ReactNode) => (
    <select name={name} value={values[name]} onChange={(e) => change(name, e.target.value)} className={field} aria-label={label}>
      {children}
    </select>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        apply(values);
      }}
      className="flex flex-wrap items-center gap-3"
    >
      <label className="relative min-w-[240px] flex-1">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          name="q"
          value={values.q}
          onChange={(e) => change("q", e.target.value)}
          placeholder="Rechercher par nom ou e-mail"
          autoComplete="off"
          className={`${field} w-full pl-9 pr-9`}
        />
        {pending && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted" aria-label="Recherche en cours" />}
      </label>
      {select(
        "role",
        "Rôle",
        <>
          <option value="tous">Tous les rôles</option>
          <option value="etudiant">Étudiant seulement</option>
          <option value="enseignant">Formateur</option>
          <option value="chef">Chef de projet</option>
          <option value="responsable">Responsable de service</option>
          <option value="pilotage">Pilotage ministériel</option>
          <option value="admin">Admin</option>
        </>,
      )}
      {select(
        "sens",
        "Sensibilité",
        <>
          <option value="toutes">Toutes les sensibilités</option>
          <option value="non_renseignee">Sensibilité non renseignée</option>
          {ministries.map((m) => (
            <option key={m.id} value={m.slug}>
              {m.name}
            </option>
          ))}
        </>,
      )}
      {select(
        "statut",
        "Statut",
        <>
          <option value="tous">Tous les statuts</option>
          <option value="actif">Actif</option>
          <option value="a_confirmer">À confirmer</option>
          <option value="desactive">Désactivé</option>
        </>,
      )}
      {select(
        "implication",
        "Implication à MLK",
        <>
          <option value="toutes">Toutes les implications</option>
          <option value="aucun">Aucun engagement</option>
          <option value="equipier">Équipiers MLK</option>
          <option value="manager">Managers et managers adjoints</option>
          <option value="collaborateur">Collaborateurs salariés</option>
          <option value="non_renseigne">Non renseigné</option>
        </>,
      )}
      {select(
        "genre",
        "Genre",
        <>
          <option value="tous">Tous les genres</option>
          <option value="homme">Hommes</option>
          <option value="femme">Femmes</option>
          <option value="non_renseigne">Genre non renseigné</option>
        </>,
      )}
      {select(
        "par",
        "Membres par page",
        <>
          <option value="25">25 par page</option>
          <option value="50">50 par page</option>
          <option value="100">100 par page</option>
        </>,
      )}
      {select(
        "tri",
        "Tri",
        <>
          <option value="nom">Tri par nom</option>
          <option value="creation">Plus récents</option>
        </>,
      )}
      <a
        href="/gestion/admin/utilisateurs/export"
        className="label rounded-md border border-foreground px-4 py-2.5 text-xs tracking-[0.12em] text-foreground hover:bg-foreground/[0.04]"
      >
        Télécharger (CSV)
      </a>
    </form>
  );
}
