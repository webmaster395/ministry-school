# Audit préalable — Mes dons spirituels V2

Date : 9 novembre 2026  
Statut : audit et maquette uniquement — aucune publication

## État actuel

- L’application existante est `Je suis ce que je suis par la grâce de Dieu`.
- Le test des dons utilise la clé existante `gifts` dans `grace_identity_assessments`.
- Le questionnaire actif contient sept questions : une par don.
- Les réponses actives sont `Oui`, `Peut-être`, `Non`.
- Le nom du don et sa définition sont liés directement à la question et peuvent être déduits pendant le parcours.
- Les résultats actuels reprennent les sept dons sous forme de cartes, sans analyse des cinq dimensions de chaque don.
- Les réponses sont conservées côté navigateur pendant le parcours puis enregistrées à la fin. Une interruption avant la fin n’offre donc pas une reprise fiable de chaque réponse.
- La table existante, son RLS, l’authentification, la publication et l’intégration dans Mon identité peuvent être conservées.

## Écarts avec le JSON validé

| Sujet | Version actuelle | Version attendue |
|---|---|---|
| Questions | 7 | 35, exactement celles du JSON |
| Échelle | 3 réponses textuelles | 0 à 5 |
| Neutralité | don déductible | aucun don visible avant les résultats |
| Ordre | un don après l’autre | mélange stable et non révélateur |
| Reprise | essentiellement à la fin | ordre et réponses partielles persistés |
| Résultats | cartes génériques | trois chapitres personnalisés |
| Interprétation | une réponse par don | cinq dimensions par don |
| Défis | conseils historiques | défis exacts du JSON |
| Direction artistique | interface Ministry standard | affiche éditoriale contemporaine sur tout le parcours |

## Architecture de remplacement proposée

1. Conserver `test_key = gifts` et la ligne existante par étudiant.
2. Versionner le contenu dans `answers`, par exemple `schemaVersion: 2`.
3. Conserver dans cette même ligne : `questionOrder`, `responses`, `currentIndex`, `startedAt` et `completedAt`.
4. Générer l’ordre une seule fois, puis le relire à chaque reprise. L’algorithme interdit deux questions consécutives du même don lorsque c’est possible.
5. Garder les clics locaux et sauvegarder par petits lots ou aux changements d’écran importants, jamais par une nouvelle requête à chaque clic.
6. Calculer les résultats côté serveur à partir des 35 identifiants autorisés. Refuser toute question, valeur ou correspondance inconnue.
7. Enregistrer seulement les catégories et éléments nécessaires à la restitution ; ne jamais exposer la correspondance question/don pendant le test.
8. Conserver les autres tests (`fruit`, `skills`) sans modification.

## Contrôle des seuils provisoires

Chaque don totalise 0 à 25 points, soit une moyenne de 0 à 5 par pas de 0,2.

- `exercised` commence à 18/25 (moyenne 3,6).
- `developing` commence à 9/25 (moyenne 1,8).
- `less_visible` couvre 0 à 8/25.

Cas contrastés à tester avant publication :

- 35 réponses à 0 : sept dons peu manifestés.
- 35 réponses à 5 : sept dons reconnus et exercés ; le texte doit éviter toute affirmation définitive.
- Un don à 5, six dons à 0 : un don exercé, six peu manifestés.
- Un don à 18/25 : exercé ; à 17/25 : à développer.
- Un don à 9/25 : à développer ; à 8/25 : peu manifesté.
- Tous les dons entre 9 et 17 : chapitre « exercés » vide.
- Tous les dons à 18 ou plus : chapitres « développer » et « peu manifestés » vides.

## Risques comportementaux à corriger avant publication

- Plusieurs questions mesurent un réflexe ou une pratique, et non une manifestation vérifiée du don. La restitution doit parler de signes rapportés, jamais de confirmation.
- Les réponses sur la guérison et les miracles ne prouvent aucun lien causal entre une prière et un résultat observé.
- Les questions fondées sur le retour d’autres personnes doivent être distinguées des convictions personnelles.
- Un score élevé peut refléter une forte fréquence déclarée, une manière de comprendre la question ou un biais d’autoévaluation.
- Les catégories peuvent être vides : le texte doit alors expliquer naturellement ce cas sans afficher une section vide.

## Décisions à valider

- Validation éditoriale des seuils 18/25 et 9/25.
- Validation de l’ordre mélangé stable et de sa règle anti-adjacence.
- Validation des maquettes avant intégration dans le composant actif.
- Validation du rythme de sauvegarde des brouillons.

