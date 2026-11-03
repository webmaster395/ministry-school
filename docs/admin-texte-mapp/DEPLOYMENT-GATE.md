# Conditions avant import ou déploiement

Le développement peut continuer sur `codex/admin-texte-mapp`, mais aucune fusion ni aucun déploiement n'est autorisé avant validation des points suivants.

## GitHub

- [ ] Le propriétaire confirme les règles de protection de `main`.
- [ ] Les modifications passent par une pull request et une revue obligatoire.
- [ ] Les textes MAPP restent absents du dépôt public et de son historique.
- [ ] Les adresses personnelles codées dans les futures migrations sont remplacées par une attribution en base.
- [ ] Un scan de secrets complet est exécuté sur l'historique.

## Supabase

- [ ] Les migrations réellement appliquées sont comparées au dépôt.
- [ ] Les politiques RLS sont testées avec les rôles autorisé et non autorisé.
- [ ] Le droit `mapp_editor` est indépendant des rôles techniques et administratifs généraux.
- [ ] Les quatre comptes sont attribués hors Git, puis contrôlés par identifiant.
- [ ] Les membres techniques de l'organisation et leurs besoins d'accès sont revus.
- [ ] Les sauvegardes, exports et journaux sont vérifiés.

## Vercel

- [ ] Les membres et rôles de l'équipe Vercel sont audités.
- [ ] Les variables d'environnement sont inspectées sans les copier dans Git.
- [ ] Les déploiements de prévisualisation ne rendent pas les textes accessibles.
- [ ] La branche de production reste inchangée jusqu'à validation.

## Fonctionnel

- [ ] L'accès est vérifié côté serveur et en base, pas seulement dans l'interface.
- [ ] L'historique et les versions approuvées sont immuables.
- [ ] Les quatre éditrices valident le parcours de lecture, modification, relecture et publication.
- [ ] Un test d'accès négatif confirme qu'un développeur technique ne peut pas ouvrir l'éditeur.

