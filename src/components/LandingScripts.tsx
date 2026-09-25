"use client";

import { useEffect } from "react";

/**
 * Anime la landing : menu du téléphone, carrousel des sensibilités, onglets du programme,
 * bascule des tarifs et apparitions au défilement. Le script vient de la maquette et
 * manipule le DOM directement ; on le rejoue à chaque affichage de la page, car un retour
 * arrière du navigateur reconstruit le contenu sans recharger la page.
 */
export default function LandingScripts() {
  useEffect(() => {
    // Adresse de la billetterie BilletWeb, lue par le script pour les boutons « Prendre ma place »
    (window as unknown as { __TICKET_URL__?: string }).__TICKET_URL__ =
      process.env.NEXT_PUBLIC_BILLETWEB_URL ?? "";

    const script = document.createElement("script");
    script.src = "/landing/script.js?v=20260925";
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return null;
}
