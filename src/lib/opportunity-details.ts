/**
 * Objectifs et prérequis d'une formation ou d'un projet (fiche détaillée côté étudiant).
 * Nécessite les colonnes opportunities.objectives et opportunities.prerequisites (SQL fourni dans
 * supabase/) ; tant que OPPORTUNITIES_HAVE_DETAILS n'est pas à « 1 » sur le serveur, elles ne
 * sont jamais lues ni écrites et la fiche reste complète sans ces deux blocs.
 */
export const DETAILS_ENABLED = true;

export const DETAIL_COLUMNS = ", objectives, prerequisites, participation_audience, participation_audience_details, participation_prerequisites_required, strategic_axes, strategic_contribution_former, strategic_contribution_auberge, strategic_contribution_fundraising, strategic_axes_connection";

/** Un élément par ligne, lignes vides ignorées. */
export const linesOf = (text: string | null | undefined) =>
  (text ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
