"use client";

import { createPortal } from "react-dom";

/**
 * Sort une fenêtre (dialogue) du bloc de la page où elle est écrite, pour la poser à la racine du
 * document. Un bloc animé ou décalé fausserait sinon la position d'un élément « fixe » : la fenêtre
 * s'ouvrirait hors de l'écran. À utiliser uniquement une fois la fenêtre ouverte (jamais au rendu serveur).
 */
export default function Portal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body);
}
