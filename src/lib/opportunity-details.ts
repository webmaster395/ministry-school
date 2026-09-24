/**
 * Objectifs et prérequis d'une formation ou d'un projet (fiche détaillée côté étudiant).
 * Nécessite les colonnes opportunities.objectives et opportunities.prerequisites (SQL fourni dans
 * supabase/) ; tant que OPPORTUNITIES_HAVE_DETAILS n'est pas à « 1 » sur le serveur, elles ne
 * sont jamais lues ni écrites et la fiche reste complète sans ces deux blocs.
 */
export const DETAILS_ENABLED = process.env.OPPORTUNITIES_HAVE_DETAILS === "1";

export const DETAIL_COLUMNS = DETAILS_ENABLED ? ", objectives, prerequisites" : "";

/** Un élément par ligne, lignes vides ignorées. */
export const linesOf = (text: string | null | undefined) =>
  (text ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
