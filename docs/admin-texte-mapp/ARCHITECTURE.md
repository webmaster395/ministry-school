# Architecture proposée — Admin Texte MAPP

## Séparation des responsabilités

Le back-office reste dans Ministry School sous :

`Gestion des outils → Profil MAPP → Éditer les textes`

La page principale Profil MAPP présente les résultats globaux et les synthèses. Le bouton d'édition ouvre un espace séparé.

## Droit dédié

Créer un droit `mapp_editor` indépendant de tous les rôles existants.

- Un développeur GitHub ne reçoit aucun droit dans l'application.
- Un administrateur Ministry School ne reçoit pas automatiquement le droit MAPP.
- Un super-administrateur général ne reçoit pas automatiquement le droit MAPP.
- Seuls quatre comptes explicitement attribués peuvent lire et modifier le corpus protégé dans l'application.
- L'attribution et le retrait sont journalisés.
- Les identités ne sont pas codées en clair dans Git.

## Contrôles obligatoires

La protection doit être appliquée à quatre niveaux :

1. **Navigation** : ne pas afficher le bouton aux autres comptes.
2. **Route serveur** : refuser le rendu et les actions si `can_edit_mapp_content(auth.uid())` est faux.
3. **Base de données** : RLS `select/insert/update/delete` fondée sur la même fonction.
4. **Procédures privilégiées** : chaque fonction `security definer` vérifie explicitement le droit et fixe son `search_path`.

La sécurité ne doit jamais dépendre du masquage d'un bouton ou d'un champ côté navigateur.

## Modèle éditorial

Le stockage doit permettre :

- contexte, catégorie, situation ;
- profil lecteur simple ou combiné ;
- interlocuteur ;
- six rubriques structurées ;
- statut `draft`, `in_review`, `approved`, `published`, `archived` ;
- versions immuables et historique des changements ;
- auteur, date et motif de chaque modification ;
- validation explicite séparée de l'enregistrement ;
- ajout futur de sections comme « Dans une organisation » sans changement destructif de schéma.

Les textes validés ne sont jamais écrasés : une modification crée une nouvelle version.

## Source des contenus

- Le dépôt privé `profil-mapp-editorial-v2` reste la source de travail éditorial.
- Le dépôt applicatif public contient uniquement le schéma, le code, les tests et la documentation non sensible.
- L'import des contenus s'effectue par une procédure authentifiée et auditée, hors historique Git public.
- Les exports et sauvegardes contenant les textes restent dans un stockage privé.

## Tests attendus

- Les quatre éditrices autorisées accèdent aux pages et actions.
- Un administrateur général sans droit MAPP reçoit `403`.
- Un développeur technique sans compte éditorial reçoit `403`.
- Un étudiant, enseignant ou responsable de ministère reçoit `403`.
- Les requêtes directes Supabase sont refusées par RLS.
- Les fonctions privilégiées refusent les appels non autorisés.
- Une nouvelle version n'écrase jamais la version approuvée.
- Aucun texte protégé n'apparaît dans les bundles clients, journaux, erreurs, tests ou dépôts publics.

