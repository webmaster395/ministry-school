# Test des héros — rapport de préimport

Source contrôlée le 11 novembre 2026. Empreinte SHA-256 :
`c1a79b91d32efa13801e649cfdc4ab672f4004bd8c369ff18210bb47669de040`.

Ce rapport est une simulation. Aucune donnée n'a été écrite dans Ministry School.

| Indicateur | Résultat |
|---|---:|
| Lignes analysées | 249 |
| Portraits présents | 249 |
| Listes de moteurs présentes | 249 |
| Réponses confidentielles | 3 |
| Adresses de compte valides | 246 |
| Adresses de compte invalides | 3 |
| Doublons d'adresse | 0 |
| Réponses avec trois héros | 246 |
| Réponses avec deux héros | 3 |
| Portraits communicables avec ouverture attendue | 245 |
| Divergences nom / portrait à vérifier | 0 |
| Lignes nécessitant une vérification de source | 4 |

## Vérifications encore nécessaires

- Les lignes CSV 56, 74 et 110 n'ont pas une adresse de compte exploitable.
- Les lignes 56, 89 et 158 correspondent aux trois refus de communication. Les lignes 56 et 89 contiennent déjà le texte confidentiel générique ; la ligne 158 est signalée par la note de validation.
- La ligne 245 est le seul portrait communicable qui n'utilise pas l'ouverture attendue.
- Les correspondances Nanou (ligne 41), Gisèle (ligne 87) et Jean-Paul (ligne 146) ont été validées manuellement le 11 novembre 2026. Elles ne sont plus classées comme anomalies.
- La ligne 158 n'est pas une divergence : « No » était la réponse de refus, pas le prénom du participant.
- La correspondance avec les comptes Ministry doit être exécutée par la fonction sécurisée super-admin avant import. Aucun rapprochement par prénom n'est autorisé.
- Le résultat confidentiel restera stocké sans exposer portrait, moteurs ou héros à l'étudiant, aux recherches ou aux statistiques.

## Garde-fous

- L'import est idempotent grâce à un identifiant stable dérivé de la réponse source.
- Un résultat déjà publié n'est jamais écrasé.
- Toute création reste en brouillon et invisible jusqu'à validation.
- L'outil reste réservé aux super-administrateurs tant que sa visibilité étudiante n'est pas activée dans Gestion des outils > Test des héros.
- L'option d'écriture exige deux indicateurs explicites : `--apply` et `--confirm-production-import`.
