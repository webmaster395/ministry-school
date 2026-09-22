# Ministry School

Plateforme de formation de l'église MLK : suivre ses cours, préparer son enseignement, proposer des formations et des projets, piloter son ministère.

> Grandir • Servir • Impacter

---

## Le programme

| Phase | Période | Contenu | Lieu |
|---|---|---|---|
| **1 — Tronc commun** | Octobre → décembre | Journées communes à tous, un week-end par mois (les premiers samedis : 3 octobre, 7 novembre, 5 décembre). Le matin : formation du cœur et formation du caractère. L'après-midi : formations de service et projets. | Espace Martin Luther King (Créteil) le 3 octobre, puis MLK Studio |
| **2 — Par ministère** | Janvier → juin | Sensibilité ministérielle, propre à chaque ministère, en plus de la formation du cœur. | MLK Studio |

Les cinq ministères : **Apôtre**, **Prophète**, **Évangéliste**, **Pasteur**, **Docteur** (sensibilités apostolique, prophétique, évangélique, pastorale, doctorale).

---

## Un seul espace, des onglets selon les rôles

Tout le monde a la **vue étudiant**. Chaque rôle ajoute des onglets, et les rôles se cumulent (Ivan enseigne un cours et suit les autres comme étudiant).

Le menu suit la maquette de Rose Alice : le **menu étudiant** (Principal, Mon parcours) est le même pour tout le monde. En bas, le bloc **« Mes espaces »** propose « Mes fonctions » à ceux qui ont un rôle de gestion, et ses pages se déplient dessous. Le **sélecteur de casquette**, en haut à droite, n'apparaît que dans un espace de gestion (administration, enseignant, pilotage ministériel, responsable de service, chef de projet ; les deux derniers sont distincts). **L'administrateur a tous les espaces** : il voit les cours de tous les enseignants, pilote les cinq ministères et propose des formations et des projets. Tout en bas, la pastille du profil (photo et prénom) ouvre l'espace **Profil**, qui réunit trois onglets : Profil, Messagerie et, pour un étudiant simple, « Une question ? ». Les espaces sont définis dans `src/lib/nav.tsx`, l'espace courant est porté par `SpaceProvider`.

| Rôle | Ce qu'il ajoute |
|---|---|
| **Étudiant** (tout le monde) | Accueil, Calendrier, Mes cours, Travail à faire, Ministères, Services et projets, Messages, Profil |
| **Enseignant** | « Préparer mes cours » : présentation, objectifs, consignes et supports de ses séances ; « Messages aux étudiants » |
| **Responsable de service** | Propose des **formations de service** (avec un nombre de places) |
| **Chef de projet** | Propose des **projets** |
| **Pilotage ministériel** | Le pasteur d'un ministère, et son secrétaire (accès par adresse e-mail), préparent les cours du ministère : modalités, enseignant, présentation, objectifs, consignes, supports |
| **Administrateur** | Administration en six onglets (voir plus bas) |

Les rôles sont attribués uniquement par un administrateur, dans **Administration → Membres et accès**.

### Espace étudiant
- **Accueil** : prochaine journée de formation (frise du matin au soir), messages, « À préparer ».
- **Calendrier** : vue mensuelle, détail de la journée, fiche de chaque séance (objectifs, références bibliques, ressources, travail associé), synchronisation avec l'agenda du téléphone (fichier .ics).
- **Mes cours** : les parcours (formation du cœur, du caractère, sensibilité ministérielle) et leurs séances.
- **Travail à faire** : les consignes, à cocher, à venir / plus tard / terminées.
- **Ministères** : découvrir (vidéo et présentation), choisir sa sensibilité, ressources.
- **Services et projets** : s'inscrire aux formations de service et aux projets.
- **Une question ?** : formulaire qui range la question selon son sujet (organisation → Flora, ministères et enseignement → Nathalie, technique → équipe technique).

### Administration
Six onglets : **Vue d'ensemble** (chiffres pour les assemblées, préparation des cours par ministère), **Programme** (par journée), **Projets et formations**, **Comptes rendus** (PDF ou PowerPoint remis après chaque date), **Membres et accès** (recherche, rôles, désactivation d'un compte, secrétaires de pilotage, export CSV), **Questions** (celles posées par les membres, à transmettre puis à marquer comme traitées).

---

## Stack technique

- **Next.js 16** (App Router, serveur et actions serveur) et **React 19**
- **Tailwind CSS 4**
- **Supabase** : PostgreSQL, authentification, sécurité par ligne (RLS), stockage privé des comptes rendus
- **Resend** (SMTP) : e-mails d'authentification
- Déploiement sur **Vercel**

> Ce projet utilise une version récente de Next.js dont certaines conventions changent (par exemple `proxy.ts` à la place de `middleware.ts`). En cas de doute, lire les guides dans `node_modules/next/dist/docs/`.

---

## Installation

```bash
npm install
```

Créer `.env.local` à la racine (voir `.env.example`) :

```
NEXT_PUBLIC_SUPABASE_URL=https://<projet>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<clé publique anon>
NEXT_PUBLIC_ADOBE_FONTS_URL=            # optionnel : police Etna des titres
```

Les deux premières valeurs se trouvent dans Supabase : **Project Settings → API**. Ne jamais versionner `.env.local`.

```bash
npm run dev      # http://localhost:3000
npm run build    # construction de production
npm run lint     # vérification du code
```

---

## Adresses

`/` est la **landing publique** : la page de présentation conçue par Rose Alice, reprise dans le projet avec la police et les couleurs de la charte. Elle est accessible sans compte, tout comme `/mentions-legales`. Ses boutons mènent à `/login`, et « Prendre ma place » vers la billetterie BilletWeb (`NEXT_PUBLIC_BILLETWEB_URL` ; sans cette variable, le bouton reste désactivé).

**La création de compte n'est pas publique** : son lien n'est communiqué qu'après le paiement, dans l'e-mail de BilletWeb. `/inscription` lui-même reste fermé et renvoie vers la landing ; seule une adresse secrète y mène, définie par `INSCRIPTION_CHEMIN` (ex. `INSCRIPTION_CHEMIN=rejoindre-ministry-school` → `https://www.ministryschool.fr/rejoindre-ministry-school`). Sans cette variable, personne ne peut créer de compte. C'est une barrière pratique, pas un verrou : l'inscription passe par Supabase, qui accepte toute création de compte. Pour une fermeture stricte, il faudrait désactiver les inscriptions dans Supabase et inviter les personnes une à une. Changer la valeur invalide l'ancien lien.

**Mot de passe oublié** : `/mot-de-passe-oublie` envoie un e-mail avec un lien vers `/auth/reinitialiser`, où l'on choisit le nouveau mot de passe. Comme pour la confirmation d'inscription, le jeton n'est consommé qu'à l'enregistrement, pas à la visite du lien. La réponse est la même qu'un compte existe ou non, pour ne pas révéler qui est inscrit.

**Aperçu partagé** (WhatsApp, LinkedIn, Facebook, X) : l'image est `src/app/opengraph-image.jpg` (et `twitter-image.jpg`), 1200 × 630 px, en JPEG de moins de 300 Ko : au-delà, WhatsApp n'affiche souvent pas l'image ; titre et description dans `src/app/layout.tsx`.

`/app` oriente la personne connectée vers son espace (administration, enseignant, pilotage, propositions, sinon la vue étudiant) : c'est là qu'arrivent la connexion, l'inscription et la confirmation d'e-mail. `/connexion` reste un raccourci vers `/login`.

Un seul domaine pour tout, comme prévu : `ministryschool.fr` pour la landing, et la plateforme derrière les boutons du haut.

Les fichiers de la landing : la page dans `src/app/page.tsx`, ses styles dans `src/app/landing.css` (limités au conteneur `.landing` pour ne pas déborder sur l'application), ses images et son script dans `public/landing/`.

---

## Structure

```
src/
├── app/
│   ├── login, inscription, auth/     Connexion, création de compte, retour du lien e-mail
│   ├── etudiant/                     Vue de base de tout le monde (+ enseignement, pilotage, préparation)
│   ├── enseignant/                   Pages historiques de l'enseignant (messages, séances…)
│   ├── admin/                        Administration (page à onglets)
├── proxy.ts                          Protection des routes (redirige vers la connexion)
├── components/                       Composants partagés (admin/ : onglets de l'administration)
└── lib/
    ├── data/                         Lecture des données, par sujet
    ├── actions/                      Actions serveur partagées
    ├── ministry.ts                   Ministères : couleurs, pictos, palette des formations
    └── ministry-content.ts           Textes de l'onglet « Mon choix »
emails/                               Modèle de l'e-mail de confirmation
public/                               Logo, visuels des ministères, texture de connexion
```

---

## Modèle de données

| Table | Rôle |
|---|---|
| `profiles` | Utilisateur : nom, rôles (`role`, `is_teacher`, `is_service_lead`, `is_project_lead`, `ministry_lead_of`), ministère, service, jour de cours, désactivation |
| `ministries` | Les cinq ministères |
| `services` | Les services de l'église (Créatech, Enfants, Youth…) |
| `sessions` | Séances : date, horaire, lieu, salle, titre, parcours, intervenant, présentation, objectifs, références bibliques |
| `parcours` | Formation du cœur, formation du caractère, sensibilité ministérielle |
| `materials`, `assignments`, `assignment_completions` | Supports, consignes, et suivi de ce que chaque étudiant a fait |
| `announcements` | Messages de l'enseignant aux étudiants |
| `opportunities`, `opportunity_dates`, `opportunity_registrations` | Formations de service et projets, leurs dates, les inscriptions |
| `opportunity_reports` | Comptes rendus remis après chaque date (fichiers dans le stockage `comptes-rendus`) |
| `ministry_delegates` | Accès par e-mail d'un secrétaire à la vue d'un ministère |
| `questions` | Questions posées par les membres, par sujet, avec leur état (à traiter ou traitée) |
| `courses`, `enrollments`, `paliers`, `submissions` | Hérités d'une version précédente. `paliers` et `submissions` ne sont plus utilisés |

### Sécurité
- Toutes les tables sont protégées par des règles RLS.
- Le rôle **administrateur** et le rôle **enseignant** sont aussi inscrits dans le jeton de connexion (`app_metadata.role`), ce que lisent plusieurs règles. Un changement de rôle s'applique donc à la prochaine connexion.
- Un verrou en base (`protect_profile_privileges`) empêche un utilisateur de modifier ses propres rôles.
- Les attributions de rôles et la désactivation d'un compte passent par des fonctions réservées aux administrateurs (`set_user_access`, `set_user_active`).
- Le nombre d'étudiants attendus par séance n'est donné, sans aucun nom, qu'à ceux qui préparent la séance.

---

## Configuration Supabase

### Authentification — **Authentication → URL Configuration**
- *Site URL* : `https://www.ministryschool.fr`. C'est l'adresse que les e-mails utilisent pour leurs liens.
- *Redirect URLs* : `https://www.ministryschool.fr/**` (et `http://localhost:3000/**` pour travailler en local)

### E-mails — **Authentication → Emails → SMTP Settings**

| Champ | Valeur |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | clé API Resend |
| Sender email | adresse du domaine vérifié |

Deux modèles d'e-mail, à coller dans **Authentication → Emails** (onglet *Source*), en remplaçant tout le contenu :

| Modèle Supabase | Fichier | Sujet conseillé |
|---|---|---|
| *Confirm signup* | [`emails/confirmation-inscription.html`](emails/confirmation-inscription.html) | Confirmez votre inscription à Ministry School |
| *Reset password* | [`emails/reinitialisation-mot-de-passe.html`](emails/reinitialisation-mot-de-passe.html) | Réinitialisez votre mot de passe Ministry School |

Leurs liens mènent à une page du site avec un bouton (`/auth/confirm`, `/auth/reinitialiser`) : les messageries et outils qui ouvrent les liens à l'avance ne peuvent pas les consommer à la place de la personne. Avec le modèle par défaut de Supabase, le lien est à usage unique dès la première visite, et il est souvent « brûlé » avant que la personne clique.

Avant l'ouverture au public :
- **Vérifier le nom de domaine** chez le fournisseur d'e-mails (SPF, DKIM, DMARC). Sans cela, les e-mails partent en spam ou n'arrivent pas.
- **Vérifier les plafonds d'envoi** : la formule gratuite de Resend est limitée à un petit nombre d'e-mails par jour, et Supabase limite lui-même les envois par heure (réglable dans **Authentication → Rate limits**). Prévoir une formule adaptée au pic d'inscriptions.
- **Supprimer les comptes de démonstration** (adresses en `.demo@ministryschool.app`).

### Stockage
Deux espaces privés. `avatars` reçoit les photos de profil (facultatives, réduites à 256 px dans le navigateur, 512 Ko au plus, une seule par personne) : elles ne sont visibles que de la personne et de l'administrateur. `comptes-rendus` reçoit les fichiers (PDF ou PowerPoint, 20 Mo au plus). Le dépôt part directement du navigateur vers le stockage, sans passer par le serveur. À surveiller : la place disponible selon la formule Supabase.

---

## Déploiement sur Vercel

1. Importer le dépôt (le projet est à la racine, aucun réglage de dossier)
2. Variables d'environnement : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et, si on l'a, `NEXT_PUBLIC_ADOBE_FONTS_URL`
3. Après le déploiement, reporter l'adresse obtenue dans la configuration Supabase (voir plus haut)

---

## Charte graphique

Direction « L'ovale » : encre sur papier crème, avec le logo ovale comme élément de marque.
- Les cinq couleurs de **ministères** ne servent que d'étiquettes (filet, point, picto).
- Les **formations** ont leur propre palette (`--f-*` dans `src/app/globals.css`), sans lien avec celles des ministères.
- Jetons de couleur : `src/app/globals.css` ; ministères et pictos : `src/lib/ministry.ts`.
- Titres : **Etna** (Adobe Fonts, à renseigner dans `NEXT_PUBLIC_ADOBE_FONTS_URL`, sinon une serif de secours) ; libellés : **Jost** ; texte : **Geist**.

---

## Reste à faire

- **Versionner le schéma de la base** : les tables, règles de sécurité et fonctions ont été créées directement dans Supabase et ne sont pas encore enregistrées dans le dépôt (dossier de migrations). À faire avant de travailler à plusieurs.
- Nom de domaine, vérification des e-mails et choix du stockage des fichiers (Supabase ou un service dédié)
- Version mobile (après validation de la version ordinateur)
- Écran de gestion des textes des parcours
- Renvoi du lien de confirmation par l'administrateur
- Paiement automatique : volontairement laissé de côté pour le moment
- Nettoyage éventuel des tables héritées (`paliers`, `submissions`)
