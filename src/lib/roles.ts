/**
 * Les rôles d'une personne. Ce fichier ne dépend d'aucun code serveur : la barre latérale,
 * qui s'exécute dans le navigateur, peut donc l'importer sans risque.
 *
 * Les rôles se cumulent : tout le monde a la vue étudiant, et chaque rôle ajoute des onglets.
 */
export type ViewerRoles = {
  admin: boolean;
  /** Super administration nominative : Rose-Alice, Flora ou Nathalie uniquement. */
  superAdmin: boolean;
  projectsTraining: boolean;
  /** Validation éditoriale nominative (Flora ou Nathalie), indépendante du rôle admin. */
  editorialReviewer: boolean;
  /** Ministères pilotés (en propre ou par délégation), par identifiant */
  steeringMinistryIds: string[];
  /** Catégories de formation administrables (responsable ou contributeur). */
  formationCategoryKeys: string[];
  /** Affiche le parcours étudiant uniquement lorsqu'une inscription active existe. */
  hasDeepeningEnrollment: boolean;
};

/** Un étudiant « simple » : aucun rôle en plus de la vue étudiant. Seul lui peut poser des questions. */
export function isPlainStudent(roles: ViewerRoles) {
  return (
    !roles.admin &&
    !roles.superAdmin &&
    !roles.projectsTraining &&
    !roles.editorialReviewer &&
    roles.steeringMinistryIds.length === 0 &&
    roles.formationCategoryKeys.length === 0
  );
}
