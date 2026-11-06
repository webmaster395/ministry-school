// Ordered readings for the recorded under-pressure primary and secondary profiles.
// These describe possible tendencies, not measured individual reactions.
export const pressureResultReadings = {
  DI: { title: "Décider et mobiliser.", text: "Le besoin de reprendre une direction peut aller de pair avec l'envie de garder les autres engagés dans l'action." },
  DS: { title: "Agir sans perdre le lien.", text: "Une décision rapide peut s'accompagner d'une attention à la stabilité et aux personnes concernées." },
  DC: { title: "Trancher avec des repères.", text: "L'envie d'avancer peut coexister avec le besoin de vérifier les éléments qui comptent avant de décider." },
  ID: { title: "Rassembler pour avancer.", text: "Les échanges peuvent donner de l'élan à la situation, tandis qu'une envie de conclure plus vite se fait sentir." },
  IS: { title: "Entretenir l'élan collectif.", text: "Le contact avec les autres peut rester important, avec une attention particulière à la continuité des relations." },
  IC: { title: "Échanger, puis clarifier.", text: "L'ouverture aux idées peut rencontrer un besoin de faits fiables pour choisir une direction." },
  SD: { title: "Préserver, puis agir.", text: "Le besoin de stabilité peut précéder une décision plus ferme lorsque la situation demande d'avancer." },
  SI: { title: "Garder le lien vivant.", text: "La recherche de repères peut s'accompagner d'échanges plus nombreux pour traverser la tension avec les autres." },
  SC: { title: "Sécuriser avant d'avancer.", text: "La prudence relationnelle peut se renforcer par une recherche de détails fiables et de continuité." },
  CD: { title: "Vérifier pour décider.", text: "L'analyse des risques peut prendre la première place, sans effacer l'envie de débloquer la décision." },
  CI: { title: "Comprendre et confronter les idées.", text: "La recherche de précision peut s'enrichir des échanges, même lorsque la situation presse." },
  CS: { title: "Avancer sur des bases sûres.", text: "Les faits et les repères stables peuvent aider à prendre position sans brusquer les personnes concernées." },
} as const;
