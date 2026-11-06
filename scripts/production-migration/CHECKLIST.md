# Checklist d'autorisation production

## Avant sauvegarde distante

- [ ] Autorisation explicite de lire et sauvegarder Ministry et l'ancien MAPP.
- [ ] Références exactes des projets revues par deux personnes.
- [ ] Destination chiffrée et capacité disque vérifiées.
- [ ] Responsable de la conservation et date de destruction définis.
- [ ] Aucun secret dans les fichiers ou rapports.

## Avant migration

- [ ] Dumps Ministry et MAPP créés, empreintes consignées.
- [ ] Restauration complète réussie sur base temporaire.
- [ ] Objets Storage restaurés et empreintes vérifiées.
- [ ] Volumes et contrôles d'intégrité conformes.
- [ ] Commit et déploiement initiaux figés.
- [ ] Migrations additives revues.
- [ ] Correspondances d'identité approuvées individuellement ou par source autoritative.
- [ ] Plan de communication et fenêtre de maintenance approuvés.
- [ ] Critères d'arrêt et responsables nommés.

## Après migration

- [ ] Accès étudiant actif/confirmé accepté.
- [ ] Étudiant non confirmé et accès croisé refusés.
- [ ] 50 réponses, reprise, finalisation, départage, restitution et PDF vérifiés.
- [ ] Volumes historiques conformes ; aucun orphelin nouveau.
- [ ] CPU, RAM, pool, erreurs Auth/PostgREST et latences surveillés.
- [ ] Ancien environnement MAPP intact.
