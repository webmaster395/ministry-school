# Charge événement Ministry + MAPP

Le script prépare exactement trois vagues : 30 inscriptions, 290 connexions et 300 parcours MAPP. Il n'est pas exécuté automatiquement.

Garde-fous obligatoires : environnement isolé prouvé, comptes synthétiques, `LOAD_TEST_AUTHORIZED=YES`, liste explicite `LOAD_TEST_ALLOWED_HOSTS`, métriques Supabase/Vercel actives et arrêt manuel prêt. Le manifeste de comptes ne doit contenir aucune donnée réelle.

Le parcours MAPP de référence produit par étudiant : 1 Auth de connexion, 1 RPC d'ouverture, 10 RPC de sauvegarde (5 réponses chacune), 1 RPC de finalisation et 1 RPC de lecture consolidée. Les paliers ultérieurs doivent rester séparés ; ce scénario événementiel ne doit être lancé qu'après succès fonctionnel et autorisation explicite.
