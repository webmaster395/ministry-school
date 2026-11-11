# Import « Mes héros, mes moteurs »

L’import est toujours simulé avant écriture. La correspondance utilise exclusivement
l’adresse e-mail normalisée (espaces retirés, casse ignorée), puis conserve le `user_id`.

```json
[
  {
    "source_response_id": "form-001",
    "email": "personne@example.com",
    "first_name": "Leïla",
    "portrait": "Portrait complet…",
    "motors": ["Moteur 1", "Moteur 2", "Moteur 3"],
    "heroes": ["Héros 1", "Héros 2", "Héros 3"]
  }
]
```

Simulation :

```bash
npm run import:heroes-motors -- ./resultats.json
```

Import en brouillon, uniquement après validation du rapport :

```bash
npm run import:heroes-motors -- ./resultats.json --apply
```

Les doublons, e-mails absents, comptes introuvables et profils ambigus bloquent
l’import complet. Le script ne publie rien et n’écrase jamais un résultat publié.
