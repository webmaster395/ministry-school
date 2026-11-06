export type ManualPresentation = {
  emphasis: Partial<Record<"yourLikelyReflex" | "potentialFriction" | "recommendedApproach" | "avoid", string>>;
  experiment: { hook: string; prompts: string[]; conclusion: string };
};

const noExperimentHighlight = { hook: "", prompts: [], conclusion: "" };

export const manualPresentations: Record<string, ManualPresentation> = {
  "management/collaborateurs_encadres/motiver/D/DC": {
    emphasis: { recommendedApproach: "Ne cherche pas d’abord à relever le défi : cherche la décision dont la disparition a retiré à Paul l’envie de le relever." },
    experiment: noExperimentHighlight,
  },
  "management/collaborateurs_encadres/motiver/I/DC": {
    emphasis: { recommendedApproach: "Pierre n’a pas seulement besoin que son idée soit écoutée : il a besoin de voir qu’une contribution encore imparfaite peut gagner le droit d’exister." },
    experiment: noExperimentHighlight,
  },
  "management/collaborateurs_encadres/motiver/S/DC": {
    emphasis: { recommendedApproach: "Pour Abraham, se sentir indispensable peut masquer la démotivation au lieu de la guérir." },
    experiment: noExperimentHighlight,
  },
  "management/collaborateurs_encadres/motiver/C/DC": {
    emphasis: { recommendedApproach: "Ne cherche pas seulement à rendre ses progrès visibles : rends visible ce que son exigence permet de préserver ou d’améliorer." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/D/D": {
    emphasis: { recommendedApproach: "Un refus ferme gagne en crédibilité lorsqu'il reconnaît le coût réel de l'occasion abandonnée." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/I/D": {
    emphasis: { recommendedApproach: "Ne refuse pas seulement la première forme d'une idée si c'est son principe même que tu ne souhaites pas accepter." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/S/D": {
    emphasis: { recommendedApproach: "Tu peux refuser de prolonger une activité sans abandonner les personnes qui comptaient sur elle." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/C/D": {
    emphasis: { recommendedApproach: "Refuse la vérification supplémentaire, pas la responsabilité de prévenir l'erreur qu'elle cherche à éviter." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/D/I": {
    emphasis: { recommendedApproach: "Ne transforme pas un refus actuel en perspective future simplement pour préserver son enthousiasme." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/I/I": {
    emphasis: { recommendedApproach: "Tu peux apprécier une idée sans ouvrir une discussion sur sa réalisation." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/S/I": {
    emphasis: { recommendedApproach: "Tu peux reconnaître un besoin légitime sans transformer les ressources de l'organisation en disponibilité permanente." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/C/I": {
    emphasis: { recommendedApproach: "Un refus fondé sur des critères déjà définis n'a pas besoin d'être redémontré à chaque nouvelle question." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/D/S": {
    emphasis: { recommendedApproach: "Faire confiance à une personne ne t'oblige pas à accepter toutes les responsabilités qu'elle souhaite prendre." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/I/S": {
    emphasis: { recommendedApproach: "Un refus exprimé tôt protège davantage l'enthousiasme qu'une possibilité entretenue sans intention réelle de l'accepter." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/S/S": {
    emphasis: { recommendedApproach: "Reconnaître un besoin ne signifie pas devoir promettre personnellement la solution demandée." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/C/S": {
    emphasis: { recommendedApproach: "Ne demande pas à une personne de démontrer davantage la valeur d'une solution lorsque tu sais que tu ne peux pas la financer." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/D/C": {
    emphasis: { recommendedApproach: "Ne demande pas des preuves supplémentaires lorsque ta décision ne dépend plus de leur résultat." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/I/C": {
    emphasis: { recommendedApproach: "Un refus juste doit reposer sur sa véritable raison, pas sur une succession d'objections faciles à corriger." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/S/C": {
    emphasis: { recommendedApproach: "Un refus peut être juste sans que la personne qui le reçoit cesse d'en être déçue." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/C/C": {
    emphasis: { recommendedApproach: "Tu n'as pas besoin de prouver qu'une demande est sans valeur pour avoir une bonne raison de la refuser." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/D/DI": {
    emphasis: { recommendedApproach: "Tu peux refuser une demande sans devoir démontrer que ton ambition est supérieure à celle de l'autre." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/I/DI": {
    emphasis: { recommendedApproach: "Ne compense pas un refus réel par une possibilité future qui n'existe pas encore." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/S/DI": {
    emphasis: { recommendedApproach: "Ne cherche pas à rendre ton refus enthousiasmant avant d'avoir reconnu ce qu'il oblige réellement à abandonner." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/C/DI": {
    emphasis: { recommendedApproach: "Tu peux refuser un report sans demander à la personne de croire qu'un risque disparaîtra grâce à sa détermination." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/D/ID": {
    emphasis: { recommendedApproach: "Tu peux encourager une initiative sans autoriser la personne à engager l'organisation." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/I/ID": {
    emphasis: { recommendedApproach: "Ne laisse pas une discussion enthousiasmante devenir une autorisation implicite." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/S/ID": {
    emphasis: { recommendedApproach: "Reconnaître l'utilité d'une demande ne signifie pas que tu peux t'engager à la financer." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/C/ID": {
    emphasis: { recommendedApproach: "Ne laisse pas une date annoncée devenir une raison suffisante de refuser une vérification indispensable." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/D/DS": {
    emphasis: { recommendedApproach: "Refuse la ressource indisponible sans porter de jugement sur l'objectif poursuivi." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/I/DS": {
    emphasis: { recommendedApproach: "Avant de dire non à un changement, distingue ce qu'il ajoute de ce qu'il permet de supprimer." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/S/DS": {
    emphasis: { recommendedApproach: "Refuse l'accumulation des responsabilités plutôt que de choisir seul celle qu'il doit abandonner." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/C/DS": {
    emphasis: { recommendedApproach: "Ne juge pas une vérification uniquement au temps qu'elle demande : examine aussi le travail qu'elle permet d'éviter." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/C/SD": {
    emphasis: { recommendedApproach: "Un refus de vérification devient plus compréhensible lorsque les conditions permettant d'arrêter ont été définies avant la dernière demande." },
    experiment: noExperimentHighlight,
  },
  "direction/personnes_sous_responsabilite/dire_non/D/DC": { emphasis: { recommendedApproach: "N'utilise pas les chiffres pour masquer un arbitrage que tu dois assumer." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/dire_non/I/DC": { emphasis: { recommendedApproach: "Avant de refuser une initiative, vérifie que tu l'évalues sur le résultat qu'elle cherche réellement à obtenir." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/dire_non/S/DC": { emphasis: { recommendedApproach: "Refuse la prolongation générale sans confondre fin du dispositif et abandon des situations en cours." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/dire_non/C/DC": { emphasis: { recommendedApproach: "Ne refuse pas une protection uniquement parce que le problème qu'elle prévient s'est rarement produit." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/dire_non/D/CD": { emphasis: { recommendedApproach: "Un refus fondé sur des conditions doit permettre de comprendre lesquelles sont réellement indispensables." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/dire_non/I/CD": { emphasis: { recommendedApproach: "Ne transforme pas une habitude d'organisation en condition obligatoire lorsqu'elle ne protège aucun risque réel." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/dire_non/S/CD": { emphasis: { recommendedApproach: "Refuse une exception lorsqu'elle compromet l'objectif de la règle, pas uniquement parce qu'elle s'écarte du fonctionnement habituel." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/dire_non/C/CD": { emphasis: { recommendedApproach: "Ne transforme pas le refus d'une méthode insuffisante en refus définitif du projet qu'elle devait servir." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/dire_non/D/IS": { emphasis: { recommendedApproach: "Ne demande pas au groupe de porter un refus qui relève déjà de ta responsabilité." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/dire_non/I/IS": { emphasis: { recommendedApproach: "Un refus n'a pas besoin d'être accompagné d'une nouvelle promesse pour préserver la valeur d'une idée." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/dire_non/S/IS": { emphasis: { recommendedApproach: "Une décision collective ne peut pas lever une contrainte que le groupe n'a pas le pouvoir de modifier." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/dire_non/C/IS": { emphasis: { recommendedApproach: "Ne refuse pas une trace écrite simplement parce que les échanges oraux se passent bien." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/dire_non/D/SI": { emphasis: { recommendedApproach: "N'utilise pas les sentiments supposés des autres pour justifier une limite qui relève de ta propre décision." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/dire_non/I/SI": { emphasis: { recommendedApproach: "Reconnaître une contribution ne t'oblige pas à lui offrir une visibilité particulière chaque fois que tu refuses une demande." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/dire_non/S/SI": { emphasis: { recommendedApproach: "Tu peux offrir une écoute réelle sans laisser croire que tu disposes de la solution demandée." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/dire_non/C/SI": { emphasis: { recommendedApproach: "Un refus de disponibilité n'a de sens que si les solutions proposées respectent réellement la limite que tu souhaites poser." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/dire_non/D/IC": { emphasis: { recommendedApproach: "Une limite de confidentialité n'a pas besoin d'être justifiée devant tout le groupe pour être légitime." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/dire_non/I/IC": { emphasis: { recommendedApproach: "Refuse la publication tant que l'autorisation nécessaire n'est pas clairement établie, sans multiplier les versions qui contournent cette limite." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/dire_non/S/IC": { emphasis: { recommendedApproach: "Refuse l'accès demandé sans traiter le besoin qui l'a motivé comme une simple exception aux règles." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/dire_non/C/IC": { emphasis: { recommendedApproach: "Ne confonds pas une décision bien argumentée avec une décision à laquelle aucune information nouvelle ne pourrait plus rien apporter." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/dire_non/D/CI": { emphasis: { recommendedApproach: "Ne refuse pas parce que tout n'est pas connu : refuse lorsque ce qui manque empêche de prendre une responsabilité acceptable." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/dire_non/I/CI": { emphasis: { recommendedApproach: "Refuse ce qui est faux sans transformer une erreur corrigible en jugement définitif sur toute la proposition." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/dire_non/S/CI": { emphasis: { recommendedApproach: "Refuse le partage non autorisé des informations sans fermer la possibilité d'un accompagnement légitime." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/dire_non/C/CI": { emphasis: { recommendedApproach: "Ne refuse pas toute communication au nom de la précision lorsque certaines informations fiables peuvent déjà être utiles." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/dire_non/D/CS": { emphasis: { recommendedApproach: "Ne transforme pas ton exigence d'exactitude en absence de reconnaissance." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/dire_non/I/CS": { emphasis: { recommendedApproach: "Refuse la promesse excessive sans renoncer à présenter ce qui rend réellement l'événement intéressant." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/dire_non/S/CS": { emphasis: { recommendedApproach: "Refuse la responsabilité demandée sans présenter la personne comme incapable d'aider." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/dire_non/C/CS": { emphasis: { recommendedApproach: "Refuse la conservation indéfinie sans supprimer automatiquement les informations encore nécessaires à un accompagnement réel." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/resoudre_conflit/D/D": { emphasis: { recommendedApproach: "Ne cherche pas seulement à déterminer qui décide : clarifie ce que chacun doit pouvoir décider pour assumer réellement sa responsabilité." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/resoudre_conflit/I/D": { emphasis: { recommendedApproach: "Avant de proposer une nouvelle place à quelqu'un, reconnais ce qui lui a fait perdre confiance dans la place qu'il occupait déjà." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/resoudre_conflit/S/D": { emphasis: { recommendedApproach: "Ne cherche pas uniquement à répartir plus équitablement le travail : reconstruis la possibilité de demander, d'accepter et de refuser sans pression implicite." }, experiment: noExperimentHighlight },
  "direction/personnes_sous_responsabilite/resoudre_conflit/C/D": { emphasis: { recommendedApproach: "Établis d'abord comment l'erreur s'est produite, puis distingue les responsabilités individuelles des défaillances du fonctionnement." }, experiment: noExperimentHighlight },
};
