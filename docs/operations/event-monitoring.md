# Supervision — journée Ministry School

Ce runbook sert pendant un test de charge ou une journée de formation. Il ne nécessite aucun nouvel outil : Supabase Dashboard et Vercel Observability suffisent.

## Préparation (T-30 min)

- Ouvrir quatre onglets : Supabase Auth Logs, Supabase API Logs, Supabase Database Reports, Vercel Observability.
- Sélectionner une fenêtre temporelle courte (15 à 30 minutes) et activer l'actualisation automatique.
- Noter l'heure de début et le nombre d'étudiants attendus.
- Vérifier que l'application et Supabase sont opérationnels avant d'accueillir les connexions.

## 1. Supabase Auth

Dans **Logs → Auth**, surveiller :

- chemin `/auth/v1/token` ;
- statut `429` ;
- statuts `400` et `5xx` ;
- message contenant `rate limit`.

Seuils :

- avertissement : un premier `429` ;
- critique : plus de 1 % des tentatives en erreur sur deux minutes ;
- critique : série continue de `429` pendant plus de 30 secondes.

## 2. Supabase API

Dans **Logs → API Gateway / PostgREST**, surveiller :

- statuts `>= 500` ;
- `rpc/student_viewer_context` ;
- tables `assignments`, `assignment_completions`, `materials` ;
- durée des requêtes et timeouts.

Seuils :

- avertissement : p95 supérieure à 1 seconde pendant deux minutes ;
- critique : p95 supérieure à 2 secondes ou erreurs supérieures à 1 %.

## 3. Database et pool

Dans **Reports → Database**, garder visibles : CPU, mémoire, connexions, I/O et cache hit ratio.

La base est actuellement configurée avec `max_connections = 60` :

- avertissement : 42 connexions ;
- critique : 48 connexions ;
- saturation imminente : 54 connexions.

Pour le pooler, surveiller les clients en attente, les serveurs libres et les timeouts. Toute attente non nulle pendant plus de 30 secondes doit être considérée comme un incident.

## 4. Vercel

Dans **Observability → Functions**, filtrer :

- `/etudiant` ;
- `/etudiant/cours` ;
- `/etudiant/seances/*` ;
- erreurs et logs de niveau error.

Garder visibles : taux d'erreur, durée p95/p99, concurrence, nombre d'invocations et cold starts.

Seuils :

- avertissement : Home p95 supérieure à 2 secondes ;
- critique : p99 supérieure à 4 secondes ;
- critique : erreurs supérieures à 1 % ;
- avertissement : concurrence proche de la limite du plan.

## Relevés synchronisés

Consigner les mesures à T-15, T0, T+2, T+5 et T+15 minutes :

| Heure | Utilisateurs | Auth 429 | API 5xx | Home p95 | Connexions DB | Clients pool en attente | Erreurs Vercel |
|---|---:|---:|---:|---:|---:|---:|---:|
| | | | | | | | |

## Décision pendant le test

- Continuer : erreurs < 1 %, aucun 429 durable, Home p95 < 2 s et aucune attente pool durable.
- Maintenir le palier : un seuil d'avertissement est franchi.
- Arrêter la montée : un seuil critique est franchi, sans passer au palier suivant.

Après l'événement, exporter ou capturer les cinq graphiques et conserver les horaires précis afin de les corréler avec `pg_stat_statements` et les logs applicatifs.
