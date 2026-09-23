/**
 * Brouillons de cours : un cours « brouillon » n'est visible que du pilotage, pas des étudiants.
 * Il faut que la colonne sessions.is_draft existe en base (SQL fourni avec la livraison) ; tant que
 * SESSIONS_HAVE_DRAFTS n'est pas à « 1 » sur le serveur, rien ne change et la colonne n'est jamais lue.
 */
export const DRAFTS_ENABLED = process.env.SESSIONS_HAVE_DRAFTS === "1";

/** Fragment à ajouter à une liste de colonnes « select » pour lire le drapeau brouillon. */
export const DRAFT_COLUMN = DRAFTS_ENABLED ? ", is_draft" : "";
