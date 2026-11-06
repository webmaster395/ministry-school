# Sauvegarde et migration Ministry + MAPP

Ces procédures sont **préparées mais non exécutées**. Elles ne doivent être lancées qu'après autorisation explicite, revue des cibles et fenêtre de maintenance validée.

## Garde obligatoire

1. Identifier par leurs références les deux projets sources et le projet Ministry cible.
2. Refuser toute commande si une référence ne correspond pas au manifeste approuvé.
3. Ne jamais placer une URL, un mot de passe, un JWT ou une clé de service dans un fichier versionné ou dans la ligne de commande conservée par l'historique du shell.
4. Utiliser des variables injectées par un coffre temporaire et désactiver l'historique de la session opératoire.
5. Créer un dossier de sauvegarde chiffré, daté, à accès restreint.

## Contenu minimal de la sauvegarde

- dump PostgreSQL complet Ministry, incluant `auth`, `public`, `storage` et les schémas techniques requis ;
- dump PostgreSQL complet de l'ancien projet MAPP ;
- export séparé des lignes de contrôle et des volumes par table ;
- copie des objets Storage (PDF et documents) avec chemin, taille, type et empreinte SHA-256 ;
- inventaire des buckets, politiques, fonctions, hooks Auth, URLs de redirection et paramètres nécessaires, sans valeur secrète dans le rapport ;
- références Git, commit de production, identifiants et horodatages des déploiements actifs ;
- manifeste des versions de migrations.

## Vérification obligatoire avant migration

1. Calculer SHA-256 et taille de chaque archive.
2. Restaurer chaque dump dans une base PostgreSQL temporaire isolée.
3. Comparer schémas, contraintes, volumes, minima/maxima temporels et détection d'orphelins.
4. Restaurer un échantillon de fichiers Storage dans un bucket de validation non public et vérifier leurs empreintes.
5. Exécuter les requêtes de contrôle de `scripts/mapp-history/preflight.sql` sur la source et `validate-target.sql` sur la restauration.
6. Consigner la durée de restauration et le responsable ayant vérifié le résultat.

Une archive seulement créée, mais jamais restaurée, ne constitue pas une sauvegarde vérifiée.

## Ordre d'activation

1. Geler la version source et relever les volumes.
2. Produire et restaurer les sauvegardes de contrôle.
3. Appliquer les migrations additives MAPP au Supabase Ministry.
4. Vérifier RLS, fonctions, droits et questionnaire publié, sans activer l'accès étudiant.
5. Importer les données historiques dans une transaction ou un lot rejouable.
6. Appliquer uniquement la table de correspondance d'identités approuvée ; ne jamais utiliser l'e-mail comme clé automatique.
7. Comparer les volumes et associations, puis activer la candidate sur un périmètre interne.
8. Effectuer les contrôles fonctionnels et seulement ensuite ouvrir Profil MAPP aux étudiants.
9. Conserver l'ancien MAPP intact et en lecture seule pendant la période de surveillance convenue.

## Retour arrière

- désactiver l'accès au module MAPP natif via sa configuration, sans supprimer de données ;
- revenir à l'artefact applicatif précédent ;
- conserver les tables `mapp` additives en place tant qu'une analyse n'a pas confirmé leur suppression sûre ;
- si une restauration est requise, restaurer d'abord vers une base temporaire, vérifier, puis suivre la procédure fournisseur approuvée ;
- remettre l'ancien parcours MAPP en service uniquement si ses domaines, callbacks et données n'ont pas été altérés ;
- rapprocher les écritures réalisées pendant la fenêtre avant toute reprise.

Un rollback Vercel n'annule jamais une migration PostgreSQL ni des données déjà importées.
