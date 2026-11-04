export const graceIdentitySlug = "je-suis-par-la-grace-de-dieu";

export const fruitTraits = [
  ["amour", "Amour", "Choisir le bien de l’autre avec bienveillance et vérité."],
  ["joie", "Joie", "Garder une joie profonde, même lorsque les circonstances changent."],
  ["paix", "Paix", "Avancer avec confiance plutôt qu’avec agitation ou peur."],
  ["patience", "Patience", "Prendre le temps d’écouter, d’attendre et de persévérer."],
  ["bonté", "Bonté", "Chercher concrètement ce qui peut faire du bien autour de toi."],
  ["bienveillance", "Bienveillance", "Accueillir les autres avec douceur, générosité et respect."],
  ["fidélité", "Fidélité", "Rester fiable dans tes paroles, tes engagements et tes relations."],
  ["douceur", "Douceur", "Exprimer la force avec délicatesse et maîtrise de soi."],
  ["maitrise", "Maîtrise de soi", "Choisir tes réactions et tes priorités avec discernement."],
] as const;

export const spiritualGifts = [
  ["discernment", "Discernement des esprits", "Reconnaître avec sagesse ce qui construit, ce qui trouble et ce qui mérite d’être éprouvé.", "Par exemple, aider un groupe à prendre du recul face à une parole ou une situation."],
  ["knowledge", "Parole de connaissance", "Recevoir ou partager une compréhension utile qu’on n’aurait pas obtenue seulement par ses propres moyens.", "Par exemple, apporter un éclairage précis qui aide une personne à avancer."],
  ["faith", "Don de foi", "Encourager à faire confiance à Dieu avec une assurance particulière dans une situation donnée.", "Par exemple, garder une espérance paisible et communicative dans une période difficile."],
  ["healing", "Don de guérison", "Prier avec foi pour la guérison et accompagner avec compassion.", "Par exemple, prier avec une personne qui souffre sans faire de promesse irréaliste."],
  ["miracles", "Don d’opérer des miracles", "Voir Dieu agir d’une manière qui dépasse les moyens ordinaires.", "Par exemple, témoigner avec humilité d’une intervention marquante de Dieu."],
  ["prophecy", "Don de prophétie", "Partager un encouragement, une exhortation ou une consolation qui édifie.", "Par exemple, exprimer avec amour une parole qui relève et fortifie."],
  ["wisdom", "Parole de sagesse", "Apporter une direction juste et concrète dans une situation complexe.", "Par exemple, aider à discerner une prochaine étape avec paix et clarté."],
] as const;

export const naturalSkillCategories = [
  { title: "Professionnalisme", skills: ["Autonomie", "Éthique et sens des responsabilités", "Sens de l’initiative", "Intérêt et motivation", "Efficacité et efficience", "Gestion de la qualité"] },
  { title: "Capacité d’adaptation et de gestion", skills: ["Adhésion au projet", "Atteinte d’objectifs", "Flexibilité", "Ouverture à la critique", "Gestion multiprojet", "Capacité d’analyse", "Esprit de synthèse", "Organisation du travail", "Respect des échéances", "Jugement", "Analyse et résolution de problèmes", "Adaptation", "Intégrité", "Persévérance", "Ténacité", "Résistance au stress", "Dynamisme et énergie", "Contrôle", "Délégation des responsabilités", "Entrepreneuriat", "Gestion participative", "Détermination", "Leadership", "Orientation vers la clientèle", "Planification", "Vision organisationnelle"] },
  { title: "Communication et relations interpersonnelles", skills: ["Synthèse d’information", "Travail d’équipe et collaboration", "Écoute", "Communication écrite", "Communication orale", "Établissement d’un réseau de contacts", "Animation d’un groupe", "Facilité d’intégration", "Formation", "Présentation orale", "Sensibilité", "Négociation", "Vente et persuasion", "Bilinguisme"] },
  { title: "Compétences théoriques et pratiques", skills: ["Maîtrise de connaissances théoriques et pratiques", "Analyse financière", "Capacité d’apprendre", "Sensibilité à la sécurité", "Innovation et créativité", "Opération d’un procédé"] },
] as const;

export type GraceTestKey = "fruit" | "gifts" | "skills";
