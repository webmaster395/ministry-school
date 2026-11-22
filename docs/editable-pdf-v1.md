# Ministry School Editable PDF V1

## But

Transporter dans un fichier PDF unique :

1. le rendu PDF immédiatement lisible ;
2. la source structurée nécessaire à une édition fiable ;
3. l'identifiant exact du gabarit qui garantit la fidélité du prochain rendu.

Ce format ne tente pas de reconstruire la structure d'un PDF arbitraire.

## Conteneur

Le fichier utilisateur reste un PDF standard. Sa source est une pièce jointe PDF standard :

- Nom : `ministry-school-source.v1.json`
- Type MIME : `application/vnd.ministry-school.editable-pdf+json`
- Schéma : `ministry-school.editable-pdf`
- Version : `1`

Le mot-clé PDF `source-sha256:<empreinte>` permet de vérifier l'intégrité de la pièce jointe avant de l'ouvrir.

## Source V1

La source contient :

- les métadonnées du document ;
- l'identifiant et la version du gabarit ;
- l'identifiant du jeu d'assets ;
- les blocs de contenu dans leur ordre de flux ;
- le texte exact de chaque bloc ;
- la taille, la couleur, l'interligne et les espacements ;
- le saut de page placé avant un bloc.

Les polices et les éléments graphiques sont désignés par des rôles et par un gabarit versionné. Le rendu ne dépend donc pas de coordonnées extraites du PDF.

## Compatibilité des moteurs

Le moteur qui crée le PDF peut être React-PDF, ReportLab ou un autre moteur conforme. Après génération de la page, il doit attacher la source V1 au PDF.

Ministry School utilise PDF.js pour lire la pièce jointe et refuse l'édition si :

- la pièce jointe est absente ;
- le schéma ou la version ne sont pas pris en charge ;
- l'empreinte ne correspond pas ;
- le gabarit ou ses assets ne sont pas disponibles.

Dans ces cas, le PDF reste consultable mais n'est pas présenté comme éditable.

## Règle de fidélité

L'aperçu et l'export utilisent le même composant de rendu et la même source. L'ajout de la pièce jointe intervient après le rendu et ne modifie pas les pages visibles.

## Limite du prototype

La source Nathalie fournie dans la preuve est une source de test créée à partir du contenu connu. Elle ne prétend pas avoir été extraite fidèlement d'un PDF existant.
