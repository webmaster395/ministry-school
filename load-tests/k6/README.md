# Test de charge — parcours étudiant critique

Scénario : `Connexion → Home → Mes cours → ouverture d'un cours et de ses ressources`.

Le script utilise un compte Supabase distinct par utilisateur virtuel et reproduit le cookie créé par `@supabase/ssr`. Ne jamais utiliser de vrais mots de passe étudiants.

## Préparation

1. Installer k6 : `brew install k6`.
2. Créer des comptes étudiants dédiés avec le même rattachement fonctionnel que la promotion réelle.
3. Copier `accounts.example.csv` vers un fichier hors Git, par exemple `/tmp/ministry-load-accounts.csv`.
4. Utiliser uniquement la clé Supabase publique `anon`/publishable, jamais la service role.
5. Ouvrir le runbook [`docs/operations/event-monitoring.md`](../../docs/operations/event-monitoring.md).

Format du CSV :

```csv
email,password
loadtest-student-001@example.test,mot-de-passe-unique
```

## Reproduire les IP mobiles distribuées

Un runner k6 correspond généralement à une IP publique. Lancer 50 connexions depuis un seul runner recréerait artificiellement le burst Supabase par IP que les étudiants en 4G/5G ne partagent pas.

Répartition prudente, limitée à 25 connexions par IP de sortie :

- 50 utilisateurs : 2 runners × 25 VU ;
- 100 utilisateurs : 4 runners × 25 VU ;
- 300 utilisateurs : 12 runners × 25 VU ;
- 500 utilisateurs : 20 runners × 25 VU.

Les runners doivent démarrer dans la même fenêtre de quelques secondes. `SHARD_INDEX` commence à zéro et `SHARD_COUNT` est identique partout. Le script répartit les comptes sans duplication.

Exemple : premier runner du palier 100 :

```bash
APP_URL=https://preview.example.com \
SUPABASE_URL=https://PROJECT.supabase.co \
SUPABASE_ANON_KEY=PUBLIC_KEY \
ACCOUNTS_FILE=/tmp/ministry-load-accounts.csv \
SESSION_ID=UUID_D_UN_COURS_ACCESSIBLE_AUX_COMPTES_DE_TEST \
TARGET_VUS=25 \
SHARD_INDEX=0 \
SHARD_COUNT=4 \
k6 run load-tests/k6/student-critical-path.js
```

Les autres runners utilisent `SHARD_INDEX=1`, `2` et `3`.

`SESSION_ID` est recommandé afin que tous les paliers ouvrent exactement le même cours. S'il est omis, le script prend le premier cours détecté sur la Home.

## Déroulement

### Palier 50

- 2 runners × 25 VU ;
- une itération par compte ;
- arrêter si un seuil critique du runbook est franchi.

### Palier 100

- uniquement après validation du palier 50 ;
- 4 runners × 25 VU ;
- comparer p95/p99, Auth 429, API 5xx, DB/pool et Vercel au palier précédent.

### Paliers 300 et 500

Ne pas les exécuter avant validation explicite de 50 puis 100. Utiliser respectivement au moins 12 puis 20 IP de sortie.

## Critères de validation

- Auth 429 : zéro ;
- erreurs HTTP : moins de 1 % ;
- Home p95 : moins de 2 secondes ;
- Home p99 : moins de 4 secondes ;
- aucune attente pool durable ;
- aucune saturation Vercel ou DB ;
- tous les comptes atteignent une page cours.

Conserver le résumé k6 de chaque runner et les relevés du runbook avec des horodatages synchronisés.
