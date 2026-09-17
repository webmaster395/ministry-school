# Ministry School

Plateforme de formation de Ministry School — espaces étudiant, enseignant et administrateur.

> Grandir • Servir • Impacter

---

## Le programme en deux phases

| Phase | Période | Contenu | Lieu |
|---|---|---|---|
| **1 — Tronc commun** | Septembre → décembre | Enseignement commun à tous les ministères, un week-end par mois. Plénière le matin, mise en pratique l'après-midi. Ce premier samedi (19 sept.) : **Paul Goulet** — **Le caractère** (à MLK 2). Prochaines sessions à l'Espace Grand Paris. | MLK 2 (ce samedi 19) / Espace Grand Paris (salles : Giroud, Rosa Parks, Denis) |
| **2 — Par ministère** | À partir de janvier | Cours par ministère, organisés en paliers d'environ 3 mois. Mêmes contenus le samedi et le dimanche, au choix de l'étudiant. | MLK 2 (= MLK Studio) |

Les cinq ministères : **Apôtre**, **Prophète**, **Évangéliste**, **Pasteur**, **Docteur**.

> **Lieux** — deux sites distincts :
> - **MLK 2 / MLK Studio** : site unique, une seule adresse. Utilisé pour **ce samedi 19 septembre** (Paul Goulet) ainsi que pour la **Phase 2** (cours par ministère). « MLK 2 » et « MLK Studio » désignent le même endroit.
> - **Espace Grand Paris** (Phase 1 – Tronc commun) : plusieurs salles nommées — **Giroud**, **Rosa Parks**, **Denis**. À préciser salle par salle dans le champ « Salle » lors de la programmation.

---

## Ce que fait la plateforme

### Espace étudiant
- Tableau de bord : prochaine séance (horaire, lieu, salle, intervenant), calendrier de la semaine, progression du parcours
- Calendrier de toutes les séances à venir, tronc commun inclus
- Supports de cours — **visibles uniquement à partir de l'horaire choisi par l'enseignant**, pour éviter que le contenu soit survolé avant le cours
- Consignes et rendu de devoirs
- Palier en cours et présentation des cinq ministères
- Profil

### Espace enseignant
- Tableau de bord : prochaine séance et nombre d'inscrits (utile pour préparer les travaux de groupe)
- **Partage en direct** : publier un document immédiatement visible pendant la séance
- Publication de supports avec **programmation de la date de visibilité**
- Consignes et consultation des rendus
- Vue promo : ce que la promotion a déjà vu, tous ministères confondus, pour éviter les redites entre intervenants
- Liste des étudiants inscrits par séance

### Espace administrateur
- Vue d'ensemble : étudiants, enseignants, séances, supports, devoirs rendus
- Toutes les séances et tous les utilisateurs
- **Validation des paiements** : l'accès d'un étudiant reste bloqué tant que son règlement n'est pas enregistré

---

## Stack technique

- **Next.js 16** (App Router) et **React**
- **Tailwind CSS 4**
- **Supabase** — base de données PostgreSQL, authentification, sécurité par ligne (RLS)
- **Resend** — envoi des e-mails transactionnels
- Déploiement sur **Vercel**

---

## Installation

```bash
npm install
```

Créer `.env.local` à la racine du projet :

```
NEXT_PUBLIC_SUPABASE_URL=https://<projet>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<clé publique anon>
```

Ces deux valeurs se trouvent dans Supabase : **Project Settings → API**.

```bash
npm run dev
```

L'application démarre sur `http://localhost:3000`.

---

## Structure

```
.
├── src/
│   ├── app/
│   │   ├── login/           Connexion
│   │   ├── inscription/     Création de compte
│   │   ├── auth/            Retour du lien de confirmation
│   │   ├── etudiant/        Espace étudiant
│   │   ├── enseignant/      Espace enseignant
│   │   └── admin/           Espace administrateur
│   ├── components/          Composants partagés
│   ├── lib/                 Accès aux données et client Supabase
│   └── proxy.ts             Protection des routes
├── emails/                  Modèles d'e-mails pour Supabase
└── README.md
```

---

## Modèle de données

| Table | Rôle |
|---|---|
| `profiles` | Utilisateur : nom, rôle, ministère, jour de cours, statut de paiement |
| `ministries` | Les cinq ministères |
| `sessions` | Séances : date, horaire, lieu, salle, intervenant, type (commun ou ministère) |
| `enrollments` | Inscriptions étudiant ↔ séance |
| `materials` | Supports de cours, avec date de visibilité |
| `assignments` | Consignes données par les enseignants |
| `submissions` | Devoirs rendus par les étudiants |
| `paliers` | Périodes de formation d'environ trois mois |

Toutes les tables sont protégées par des politiques RLS : un étudiant ne voit que ses propres données, un enseignant celles de ses séances, l'administrateur l'ensemble.

---

## Configuration Supabase

### Authentification

**Authentication → URL Configuration**

- *Site URL* : l'adresse de l'application (`http://localhost:3000` en local, l'URL Vercel en production)
- *Redirect URLs* : ajouter `<adresse>/auth/callback`

Sans cela, les liens de confirmation envoyés par e-mail ne ramènent pas l'utilisateur dans l'application.

### Envoi des e-mails

**Authentication → Emails → SMTP Settings**

| Champ | Valeur |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | clé API Resend |
| Sender email | adresse du domaine vérifié |

Le modèle d'e-mail de confirmation se trouve dans [`emails/confirmation-inscription.html`](emails/confirmation-inscription.html) — à coller dans **Authentication → Emails → Confirm signup**, onglet *Source*.

> **Important pour la mise en production :** tant qu'aucun domaine n'est vérifié dans Resend, les e-mails ne partent qu'à l'adresse du titulaire du compte Resend. Aucun étudiant ne recevra son lien de confirmation. La vérification d'un domaine (SPF, DKIM, DMARC) est indispensable avant l'ouverture, et règle aussi le classement en spam.

---

## Déploiement sur Vercel

1. Importer le dépôt dans Vercel (aucun réglage de Root Directory à changer, le projet est à la racine)
2. Variables d'environnement : `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Après le déploiement, reporter l'URL obtenue dans la configuration Supabase (voir ci-dessus)

---

## Reste à cadrer

- Nombre et contenu des paliers à partir d'avril
- Vérification d'un domaine d'envoi pour les e-mails
- Lien entre le règlement effectif et l'activation automatique de l'accès
- Notifications de rappel avant les séances
