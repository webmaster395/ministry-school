# Qualification de 400 à 500 connexions Ministry School

Ce protocole ne doit être exécuté que sur une préproduction explicitement autorisée, reliée à un projet Supabase de test. Le script refuse les domaines et le projet Supabase de production.

## Préparation

1. Déployer le commit à qualifier sur une préproduction Vercel dédiée.
2. Appliquer les migrations sur un projet Supabase de test de même taille que la cible.
3. Créer 500 comptes exclusivement réservés à la charge, confirmés sans e-mail et nommés `load-test`. Le script de préparation peut le faire sur la préproduction uniquement :

```bash
export LOAD_TEST_AUTHORIZED=YES
export LOAD_TEST_EMAIL_DOMAIN=qualification.ministryschool.fr
export SUPABASE_URL=https://projet-de-test.supabase.co
export SUPABASE_PROJECT_REF=reference-de-test
export SUPABASE_SERVICE_ROLE_KEY=...
export SUPABASE_ANON_KEY=...
node scripts/load-test-accounts.mjs create-batch --count=500 --batch=<uuid-du-lot>
```

Le manifeste et le CSV sont écrits en mode `0600` dans `/tmp`. La commande refuse le projet Supabase de production et sauvegarde le manifeste après chaque création pour permettre un nettoyage même en cas d’interruption.
4. Placer leurs champs `email` et `password` dans un manifeste JSON local :

```json
{
  "accounts": [
    { "email": "load-test-001@qualification.ministryschool.fr", "password": "secret" }
  ]
}
```

Utiliser un sous-domaine de test contrôlé et ne déclencher aucun e-mail. Les domaines réservés comme `.invalid` peuvent être refusés par Supabase Auth.

5. Ouvrir les tableaux de bord Vercel et Supabase avant chaque palier.

## Exécution depuis une IP publique unique

Le générateur doit sortir directement par la connexion du lieu de test, sans proxy distribué. Exécuter les paliers dans l'ordre et arrêter dès qu'un critère échoue :

```bash
export LOAD_TEST_AUTHORIZED=YES
export APP_URL=https://preview-autorisee.example.test
export SUPABASE_URL=https://projet-de-test.supabase.co
export SUPABASE_ANON_KEY=...
export LOAD_TEST_MANIFEST=/chemin/absolu/comptes-load-test.json

npm run load-test:login -- --users=50 --duration=120 --report=/tmp/ministry-login-50.json
npm run load-test:login -- --users=100 --duration=120 --report=/tmp/ministry-login-100.json
npm run load-test:login -- --users=200 --duration=120 --report=/tmp/ministry-login-200.json
npm run load-test:login -- --users=400 --duration=120 --report=/tmp/ministry-login-400.json
npm run load-test:login -- --users=500 --duration=120 --report=/tmp/ministry-login-500.json
```

Le script reproduit exactement le chemin critique : un appel `/auth/v1/token`, un `claim_delegations`, le chargement authentifié de `/etudiant`, puis l’écriture analytique étalée entre 15 et 75 secondes. Il ne déconnecte pas les sessions après le test, afin de ne pas ajouter un trafic Auth absent du scénario réel.

Pour une arrivée de 500 personnes sur deux minutes, le seau `/token` doit être configuré à **1 500 requêtes par cinq minutes** pendant la qualification et l’événement. Cette valeur couvre 500 connexions plus 20 % de reprises tout en respectant la capacité de rafale de 30. Elle doit revenir à sa valeur habituelle après l’événement. Une vague concentrée en quelques secondes reste interdite : ouvrir la connexion entre 09:28 et 09:30 ou répartir les consignes sur deux minutes.

## Mesures obligatoires

- côté script : codes HTTP par étape, 429, succès, p50/p95/p99 et pic de parcours actifs ;
- Supabase Auth : requêtes `/token`, 429 et erreurs 5xx ;
- Supabase Database : CPU, mémoire, connexions actives/en attente, I/O et verrous ;
- PostgREST : latences, 5xx, `PGRST003` et saturation du pool ;
- Vercel : durée des fonctions, concurrence, cold starts, 5xx et région.

## Critères de passage

- zéro 429, `PGRST003`, timeout ou perte de session ;
- au moins 99,9 % de parcours réussis, puis reprise manuelle vérifiée des rares erreurs réseau ;
- `/token` p95 inférieur à 1,5 seconde ;
- `/etudiant` p95 inférieur à 2,5 secondes ;
- connexions DB sous 70 % du plafond, sans pic supérieur à 80 % pendant plus de 30 secondes ;
- CPU inférieur à 70 % en régime et mémoire sous 80 % ;
- un seul appel `/token` observé par utilisateur virtuel.

Après chaque palier, attendre dix minutes, exporter les métriques et vérifier que le nombre de sessions réussies correspond au rapport. Le passage à 400 puis 500 est interdit si le palier précédent échoue.
