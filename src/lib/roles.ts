/**
 * Les rôles d'une personne. Ce fichier ne dépend d'aucun code serveur : la barre latérale,
 * qui s'exécute dans le navigateur, peut donc l'importer sans risque.
 *
 * Les rôles se cumulent : tout le monde a la vue étudiant, et chaque rôle ajoute des onglets.
 */
export type ViewerRoles = {
  teacher: boolean;
  admin: boolean;
  serviceLead: boolean;
  projectLead: boolean;
  /** Ministères pilotés (en propre ou par délégation), par identifiant */
  steeringMinistryIds: string[];
};

/** Un étudiant « simple » : aucun rôle en plus de la vue étudiant. Seul lui peut poser des questions. */
export function isPlainStudent(roles: ViewerRoles) {
  return (
    !roles.admin &&
    !roles.teacher &&
    !roles.serviceLead &&
    !roles.projectLead &&
    roles.steeringMinistryIds.length === 0
  );
}
