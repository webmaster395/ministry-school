/**
 * Type d'une ressource de cours (présentation, vidéo, lecture…). Nécessite la colonne
 * materials.resource_type (SQL fourni dans supabase/) ; tant que MATERIALS_HAVE_TYPE n'est pas
 * à « 1 » sur le serveur, le type n'est ni lu ni écrit et le reste fonctionne à l'identique.
 */
export const TYPES_ENABLED = process.env.MATERIALS_HAVE_TYPE === "1";

export const TYPE_COLUMN = TYPES_ENABLED ? ", resource_type" : "";

export const RESOURCE_TYPES = [
  "Présentation PDF",
  "Document PDF",
  "Vidéo YouTube",
  "Lien externe",
  "Lecture associée",
  "Livre recommandé",
  "Autre ressource",
] as const;

export const VISIBILITIES = [
  { key: "now", label: "Dès maintenant" },
  { key: "start", label: "Au début du cours" },
  { key: "end", label: "Après le cours" },
] as const;
