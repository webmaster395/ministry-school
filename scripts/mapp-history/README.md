# Migration historique Profil MAPP

Ces fichiers préparent une migration contrôlée ; ils ne l'exécutent pas.

1. Exécuter `preflight.sql` en lecture seule sur la source et signer le manifeste de volumes.
2. Sauvegarder intégralement la source et vérifier une restauration sur une base jetable.
3. Exporter les tables métier en conservant les UUID. Ne jamais exporter de mots de passe, JWT, sessions ou secrets Auth.
4. Importer sur un Supabase de validation vide dans l'ordre des dépendances : référentiels, participants, profils, sessions, tentatives, réponses, révisions, scores et contenus éditoriaux.
5. Ne pas importer les anciens liens `auth.users` comme identités Ministry actives. Conserver l'ancien UUID comme référence d'audit hors navigateur ; une association Ministry exige une table de correspondance explicitement validée. L'e-mail seul n'est jamais une preuve d'identité.
6. Exécuter `validate-target.sql`, comparer les volumes, les sommes de contrôle et un échantillon déterministe de résultats/PDF.
7. Tester la reprise, la finalisation idempotente et le refus d'accès croisé.

Retour arrière : arrêter les écritures de validation, conserver le journal de lot, restaurer la sauvegarde de la cible isolée ou recréer la cible. Un rollback applicatif ne remplace jamais une restauration de base. Aucune suppression sur la production n'est prévue par cette procédure.
