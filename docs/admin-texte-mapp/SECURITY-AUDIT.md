# Audit de sécurité préalable — Admin Texte MAPP

Date : 3 novembre 2026  
Périmètre : dépôts GitHub, code Ministry School, historique Git, migrations Supabase, accès disponibles et déploiement Vercel observable.

## Résultats vérifiés

### Dépôt et déploiement

- Le dépôt applicatif est `https://github.com/webmaster395/ministry-school`.
- Sa branche par défaut est `main`.
- Le dépôt est **public** et autorise les forks.
- Le domaine `ministryschool.fr` est servi par Vercel.
- L'endpoint `/api/deployment-version` annonce le commit `1100b7c5198dab5601b155588c9fb889e04e619e`, identique à la tête distante de `main` au moment du contrôle.

### Accès GitHub

- Toute personne sur Internet peut lire et copier le dépôt applicatif public.
- Trois comptes GitHub ont été trouvés parmi les collaborateurs : un propriétaire avec droits d'administration et deux collaborateurs avec droit d'écriture.
- Le compte utilisé pour cet audit possède le droit d'écriture, mais pas le droit d'administration du dépôt.
- La protection de `main` n'a pas pu être confirmée avec ce niveau d'accès. Une réponse `404` a été reçue sur l'API de protection de branche ; cela ne permet pas de distinguer une absence de protection d'une protection invisible au compte auditeur.
- Le dépôt éditorial `rtgp2911/profil-mapp-editorial-v2` est privé. Un seul collaborateur, administrateur, est visible avec le compte auditeur.
- La protection de la branche par défaut du dépôt éditorial n'est pas disponible avec l'offre GitHub actuelle.

### Secrets et données dans Git

- Aucun jeton GitHub, jeton Vercel, secret Supabase au format moderne, mot de passe de base de données ou clé privée n'a été détecté par les contrôles ciblés du contenu courant.
- L'historique contient une occurrence de `SUPABASE_SERVICE_ROLE_KEY=` ; la valeur ajoutée était vide. Ce contrôle ne révèle donc pas une clé active.
- Les fichiers `.env`, `.env.*` et `.vercel` sont ignorés par Git.
- Des adresses électroniques réelles sont toutefois présentes dans le dépôt public, notamment dans les migrations et tests qui définissent des administratrices nominatives. Elles constituent des données personnelles déjà exposées publiquement.
- Aucun fichier de participants réel n'a été identifié parmi les fichiers suivis. Les CSV repérés sont des exemples de test.

### Supabase

- Le compte d'audit voit le projet `ministry-school` dans l'organisation Supabase MLK.
- Deux membres d'organisation sont visibles : un Owner et un Developer. Ces rôles techniques peuvent avoir un accès direct au projet et à ses données indépendamment des autorisations de l'application.
- Le projet MAPP séparé appartient à une autre organisation visible avec un seul Owner.
- Le dépôt contient des politiques RLS et des fonctions `security definer` qui protègent plusieurs espaces administratifs.
- Les droits actuels de super-administration sont liés à des identités nominatives et non au simple rôle de développeur GitHub.
- La liste actuelle ne couvre pas les quatre éditrices demandées et le rôle existant est trop large : un droit MAPP dédié est nécessaire.
- L'état réellement appliqué des migrations et politiques dans la base distante n'a pas été contrôlé par une requête SQL privilégiée. Les constats RLS restent donc un audit du code versionné, pas une attestation de la base déployée.

### Vercel

- Le déploiement Vercel et son commit ont été vérifiés publiquement.
- Aucun accès Vercel authentifié n'est disponible dans cet environnement : ni CLI liée, ni jeton, ni métadonnée locale de projet.
- Les membres de l'équipe Vercel, leurs rôles, les variables d'environnement et les journaux de production n'ont donc pas pu être audités.

## Failles et risques

### Critique — textes protégés dans un dépôt public

Tout texte MAPP ajouté au dépôt applicatif serait lisible par le monde entier, même si l'interface est protégée. Les textes éditoriaux ne doivent pas être enregistrés dans le code, les migrations de données, les fixtures, les tests ou l'historique de ce dépôt public.

### Élevé — accès technique direct à Supabase

Une protection applicative réservée à quatre éditrices n'empêche pas un membre technique disposant d'un accès direct au projet Supabase de consulter ou modifier les données via le tableau de bord ou les API d'administration. Il faut distinguer :

1. l'accès à l'éditeur dans l'application, qui peut être strictement limité aux quatre éditrices ;
2. l'accès d'infrastructure à la base, qui doit être revu et réduit au minimum ;
3. une exigence absolue selon laquelle même les administrateurs de base ne pourraient jamais lire les textes, qui nécessiterait du chiffrement applicatif et une gestion de clés séparée.

### Élevé — identités administratives dans les migrations publiques

Les migrations publiques exposent des adresses personnelles ou professionnelles. Les futures autorisations ne doivent pas être codées avec des emails dans Git. Elles doivent utiliser des identifiants gérés dans la base et une procédure d'attribution auditée.

### Moyen — protection de branche non démontrée

La protection de `main`, les revues obligatoires et les contrôles de statut ne sont pas vérifiables avec les droits actuels. Aucun développement ne doit être fusionné avant confirmation par le propriétaire du dépôt.

## Conclusion de l'audit préalable

Le dépôt applicatif et son lien avec le déploiement sont confirmés. En revanche, le système ne peut pas être déclaré sécurisé pour l'éditeur MAPP aujourd'hui. Le développement peut être préparé sur une branche isolée, mais l'import des textes et tout déploiement doivent rester bloqués jusqu'à la validation des mesures de [DEPLOYMENT-GATE.md](DEPLOYMENT-GATE.md).

