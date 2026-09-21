"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { navSpaces, spaceHome, spacesForPath, type Space, type SpaceKey } from "@/lib/nav";
import type { ViewerRoles } from "@/lib/roles";

type SpaceContext = {
  roles: ViewerRoles;
  /** Les espaces de gestion de la personne ; vide pour un étudiant simple */
  spaces: Space[];
  /** L'espace de gestion de la page ouverte ; null sur les pages étudiant */
  current: Space | null;
  /** Où mène « Mes fonctions » : l'espace ouvert, sinon le dernier utilisé */
  home: string | null;
  select: (key: SpaceKey) => void;
};

const Ctx = createContext<SpaceContext | null>(null);

const STORAGE_KEY = "space";

/**
 * Porte l'espace de gestion (« casquette ») entre l'en-tête, la barre latérale et le menu du
 * téléphone. L'espace suit la page ouverte ; on retient le dernier utilisé pour « Mes fonctions ».
 */
export function SpaceProvider({ roles, children }: { roles: ViewerRoles; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const spaces = useMemo(() => navSpaces(roles), [roles]);
  const [stored, setStored] = useState<string | null>(null);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lu après le montage pour éviter un écart serveur/navigateur
      setStored(localStorage.getItem(STORAGE_KEY));
    } catch {
      // stockage indisponible : on retombe sur le premier espace
    }
  }, []);

  // Une page partagée entre deux espaces garde celui que la personne a choisi.
  const matches = spacesForPath(spaces, pathname);
  const key = matches.find((k) => k === stored) ?? matches[0] ?? null;
  const current = spaces.find((s) => s.key === key) ?? null;

  // Le détail d'un cours à préparer n'est dans aucun menu : il appartient à l'espace de gestion
  // qui y a mené (enseignant, pilotage ou administration).
  const inPreparation = !current && pathname.startsWith("/etudiant/preparation/");
  const fallback = inPreparation
    ? (spaces.find((s) => s.key === stored) ?? spaces.find((s) => ["teacher", "steering", "admin"].includes(s.key)) ?? null)
    : null;
  const shown = current ?? fallback;

  const last = spaces.find((s) => s.key === stored) ?? spaces[0] ?? null;
  const home = shown ? spaceHome(shown) : last ? spaceHome(last) : null;

  useEffect(() => {
    // Retient l'espace ouvert pour que « Mes fonctions » y revienne
    if (current && current.key !== stored) {
      try {
        localStorage.setItem(STORAGE_KEY, current.key);
      } catch {
        // sans stockage, « Mes fonctions » ouvre le premier espace
      }
    }
  }, [current, stored]);

  function select(next: SpaceKey) {
    const space = spaces.find((s) => s.key === next);
    if (!space) return;
    setStored(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // sans stockage, le choix vaut pour cette page seulement
    }
    router.push(spaceHome(space));
  }

  return <Ctx.Provider value={{ roles, spaces, current: shown, home, select }}>{children}</Ctx.Provider>;
}

export function useSpace(): SpaceContext {
  const value = useContext(Ctx);
  if (!value) throw new Error("useSpace doit être utilisé dans un SpaceProvider");
  return value;
}
