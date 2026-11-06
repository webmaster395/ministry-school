export type IdentityProfileCode = "conquerant" | "communiquant" | "facilitateur" | "analyste";

type ProfilePresentation = {
  title: string;
  primary: string;
  secondary: string;
  keywords: readonly string[];
};

// Provisional editorial copy for the identity page; kept apart from the rendering component.
export const identityProfilePresentations: Record<IdentityProfileCode, ProfilePresentation> = {
  conquerant: {
    title: "L’élan qui fait avancer",
    primary: "Tu aimes prendre l’initiative quand une situation appelle une direction claire. Décider et passer à l’action te donnent le sentiment de faire progresser les choses. Tu recherches des résultats concrets et gardes volontiers le cap face aux obstacles. Cette énergie gagne encore en portée lorsque tu laisses aussi de la place aux autres rythmes.",
    secondary: "Cette tendance apporte de l’élan à ta manière d’avancer. Elle peut t’aider à trancher lorsque plusieurs pistes restent ouvertes et à transformer une intention en action. Elle ne prend pas toute la place : elle soutient la tendance principale en donnant une direction plus affirmée aux moments qui le demandent.",
    keywords: ["Initiative", "Décision", "Autonomie", "Ambition", "Détermination", "Audace", "Action", "Résultats", "Affirmation", "Défi"],
  },
  communiquant: {
    title: "L’énergie du lien",
    primary: "Tu entres facilement en relation et aimes donner vie aux idées par l’échange. Exprimer ce qui t’anime peut susciter de l’enthousiasme autour de toi. Tu apprécies les situations où les personnes participent, réagissent et construisent ensemble. Ta spontanéité est d’autant plus utile qu’elle s’accompagne d’une écoute attentive.",
    secondary: "Cette tendance donne une dimension plus expressive à ton fonctionnement. Elle peut faciliter les échanges, rendre tes idées accessibles et inviter d’autres personnes à prendre part au mouvement. Elle nuance ta tendance principale sans la remplacer, notamment lorsque la relation compte autant que la tâche.",
    keywords: ["Enthousiasme", "Expression", "Sociabilité", "Persuasion", "Spontanéité", "Créativité", "Influence", "Échange", "Optimisme", "Mobilisation"],
  },
  facilitateur: {
    title: "La force de la confiance",
    primary: "Tu accordes de l’importance à la qualité des relations et à la place de chacun. Prendre le temps d’écouter t’aide à comprendre ce dont les autres ont besoin pour avancer. Tu apprécies les repères stables et les engagements sur lesquels on peut compter. Cette constance peut créer un cadre rassurant, sans empêcher le changement lorsque celui-ci a du sens.",
    secondary: "Cette tendance apporte de l’attention et de la stabilité à ta manière d’agir. Elle peut t’aider à entendre les besoins moins visibles et à entretenir la confiance dans la durée. En complément de ta tendance principale, elle invite à avancer avec les personnes concernées, pas seulement vers un objectif.",
    keywords: ["Écoute", "Patience", "Stabilité", "Coopération", "Fiabilité", "Loyauté", "Constance", "Soutien", "Diplomatie", "Harmonie"],
  },
  analyste: {
    title: "Le regard qui éclaire",
    primary: "Tu aimes comprendre les faits avant de te prononcer et rechercher la cohérence d’une situation. Examiner les détails t’aide à repérer ce qui mérite d’être vérifié ou clarifié. Tu accordes de la valeur à une démarche rigoureuse et à la qualité du résultat. Ton discernement est particulièrement précieux lorsqu’il laisse aussi une place à l’expérimentation.",
    secondary: "Cette tendance apporte de la précision à ton fonctionnement. Elle peut t’aider à poser les bonnes questions, à vérifier une intuition et à mieux structurer une décision. Elle complète ta tendance principale en donnant davantage de profondeur à ce que tu observes ou entreprends.",
    keywords: ["Précision", "Logique", "Rigueur", "Méthode", "Analyse", "Cohérence", "Observation", "Discernement", "Qualité", "Vérification"],
  },
};
