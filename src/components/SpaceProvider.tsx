"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { navSpaces, spaceForPath, spaceHome, type Space, type SpaceKey } from "@/lib/nav";
import type { ViewerRoles } from "@/lib/roles";

type SpaceContext = {
  spaces: Space[];
  current: Space;
  select: (key: SpaceKey) => void;
};

const Ctx = createContext<SpaceContext | null>(null);

const STORAGE_KEY = "space";

/**
 * Porte l'espace (« casquette ») affiché dans le menu, partagé entre l'en-tête,
 * la barre latérale et le menu du téléphone. L'espace suit la page ouverte ; pour une page
 * absente du menu, on garde le dernier choix de la personne, d'une visite à l'autre.
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
      // stockage indisponible : on retombe sur l'espace par défaut
    }
  }, []);

  const key = spaceForPath(spaces, pathname) ?? spaces.find((s) => s.key === stored)?.key ?? spaces[0].key;
  const current = spaces.find((s) => s.key === key) ?? spaces[0];

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

  return <Ctx.Provider value={{ spaces, current, select }}>{children}</Ctx.Provider>;
}

export function useSpace(): SpaceContext {
  const value = useContext(Ctx);
  if (!value) throw new Error("useSpace doit être utilisé dans un SpaceProvider");
  return value;
}
