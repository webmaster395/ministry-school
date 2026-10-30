/**
 * Retourne une seule occurrence de chaque ressource métier.
 *
 * Les catégories d'une initiative peuvent se recouper (projet et formation),
 * mais son identifiant stable reste l'unité de comptage globale.
 */
export function distinctById<T extends { id: string }>(rows: T[]) {
  const rowsById = new Map<string, T>();
  for (const row of rows) rowsById.set(row.id, row);
  return [...rowsById.values()];
}
