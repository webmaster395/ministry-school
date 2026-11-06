import quotidien from "./profil-mapp-quotidien-12-combinaisons-v1.json";

// Preview-only editorial copy. The ordered pair comes from the recorded natural ranking.
export const naturalFunctioningIntros = {
  DI: "Tu aimes prendre des initiatives, décider et faire avancer les choses. Ton aisance dans les échanges te permet aussi de partager tes idées et d'entraîner les autres dans tes projets.",
  DS: "Tu apprécies de prendre des responsabilités et de donner un cap concret aux projets. Ton attention aux autres t'aide à avancer sans perdre de vue la confiance et la continuité du groupe.",
  DC: "Tu cherches à faire avancer les projets et à assumer les décisions qui comptent. Ton souci de précision t'amène aussi à vérifier les faits et la qualité du résultat avant de t'engager pleinement.",
  ID: "Les échanges et les idées partagées te donnent de l'élan pour lancer de nouvelles initiatives. Quand une direction se dessine, tu peux prendre position et entraîner le groupe vers une réalisation concrète.",
  IS: "Tu trouves de l'énergie dans les échanges et les projets qui rassemblent. Ton attention au rythme de chacun peut aider cette dynamique à s'inscrire dans un climat de confiance.",
  IC: "Les idées et les discussions t'ouvrent des pistes que tu aimes partager. Ton exigence de cohérence te pousse ensuite à approfondir les détails avant de défendre une proposition.",
  SD: "Tu avances avec constance et accordes de l'importance à la confiance des personnes qui t'entourent. Quand la situation le demande, tu peux aussi prendre une décision ferme pour aider le groupe à progresser.",
  SI: "Tu tiens à construire des relations fiables et à laisser à chacun le temps de trouver sa place. Les échanges chaleureux peuvent ensuite donner davantage d'élan aux projets que tu accompagnes.",
  SC: "Tu apprécies les repères stables et les engagements que l'on peut tenir dans la durée. Ton attention aux détails t'aide à sécuriser les décisions et à faire un travail soigné.",
  CD: "Tu aimes comprendre les faits et avancer sur des bases solides. Une fois la direction clarifiée, tu peux prendre les commandes pour atteindre un résultat exigeant.",
  CI: "Tu prends le temps d'examiner les informations et de construire des idées cohérentes. Le dialogue t'aide aussi à les partager et à explorer d'autres perspectives.",
  CS: "Tu apprécies de vérifier les faits et de bien structurer ce que tu entreprends. Ton souci de continuité t'amène aussi à tenir compte des personnes et des engagements pris.",
} as const satisfies Record<keyof typeof quotidien.combinations, string>;
