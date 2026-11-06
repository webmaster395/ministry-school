import type { IdentityTieCode, IdentityTieRun, IdentityTiePart } from "./identity-tie-message";

export type IdentityInterpretation = { subtitle: string; parts: IdentityTiePart[] };
export type InitialNaturalScores = Partial<Record<IdentityTieCode, number>>;

const profileNames: Record<IdentityTieCode, string> = {
  D: "Conquérant", I: "Communiquant", S: "Facilitateur", C: "Analyste",
};
const order: IdentityTieCode[] = ["D", "I", "S", "C"];
const combinationCopy: Record<IdentityTieCode, Partial<Record<IdentityTieCode, string>>> = {
  D: {
    I: "Tu apprécies de pouvoir décider et faire avancer les choses, tout en donnant aux autres envie de participer. Cette association peut faire de toi une personne qui impulse une direction et sait la partager.",
    S: "Tu aimes faire avancer les choses sans perdre de vue les personnes qui devront les vivre avec toi. Prendre une décision et préserver la confiance peuvent ainsi aller de pair dans ta manière d'agir.",
    C: "Tu recherches des résultats concrets, tout en voulant comprendre ce qui fonde tes décisions. Cette attention aux faits donne de la solidité à l'élan que tu souhaites créer.",
  },
  I: {
    D: "Tu aimes partager une idée et entraîner les autres, puis chercher comment lui donner une forme concrète. L'enthousiasme de l'échange s'accompagne chez toi d'une envie d'avancer.",
    S: "Tu apprécies les échanges vivants et l'attention portée à chacun. Créer du lien compte pour toi autant que cultiver un climat où les personnes se sentent à leur place.",
    C: "Tu aimes rendre les idées accessibles sans en perdre la précision. Le plaisir de communiquer s'appuie chez toi sur le besoin de comprendre ce que tu transmets.",
  },
  S: {
    D: "Tu tiens à construire une relation de confiance et à donner de la continuité à ce qui est engagé. Lorsque la situation appelle une décision, tu peux aussi prendre l'initiative pour faire avancer le groupe.",
    I: "Tu accordes de l'importance aux relations fiables et aux échanges chaleureux. Ta façon d'accueillir les autres peut leur donner envie de prendre part à ce qui se construit ensemble.",
    C: "Tu apprécies les repères stables et le soin apporté aux détails. Vérifier ce qui est nécessaire t'aide à proposer un cadre sur lequel les autres peuvent s'appuyer.",
  },
  C: {
    D: "Tu préfères comprendre les enjeux avant de trancher, puis avancer lorsque tes critères sont clairs. La réflexion nourrit ainsi des décisions que tu peux assumer.",
    I: "Tu aimes aller au fond des sujets et trouver ensuite les mots pour les rendre accessibles. La clarté de tes explications prend appui sur ce que tu as pris le temps d'examiner.",
    S: "Tu recherches des choix fiables et un cadre que les autres peuvent s'approprier. L'attention portée aux détails va de pair avec le souci d'avancer à un rythme tenable pour chacun.",
  },
};
const text = (value: string): IdentityTiePart => ({ text: value });
const bold = (value: string): IdentityTiePart => ({ text: value, strong: true });

function list(codes: readonly IdentityTieCode[]) {
  const names = codes.map((code) => profileNames[code]);
  return names.length === 2 ? names.join(" et ") : `${names.slice(0, -1).join(", ")} et ${names.at(-1)}`;
}

function verifiedTie(run: IdentityTieRun | null | undefined, scores: InitialNaturalScores | null | undefined, primary: IdentityTieCode, secondary: IdentityTieCode) {
  if (!run || run.status !== "completed" || !scores) return null;
  if (!order.every((code) => typeof scores[code] === "number" && Number.isFinite(scores[code]))) return null;
  const values = order.map((code) => scores[code] as number);
  const sortedValues = [...new Set(values)].sort((a, b) => b - a);
  const expected = order.filter((code) => scores[code] === sortedValues[run.rank_scope === "secondary" ? 1 : 0]);
  const candidates = run.candidate_codes;
  if (expected.length < 2 || expected.length !== candidates.length || !expected.every((code) => candidates.includes(code))) return null;
  const chosen = [...(run.result_profile_choice_answers ?? [])].sort((a, b) => a.sequence - b.sequence).map((answer) => answer.selected_code);
  if (run.rank_scope === "secondary") {
    if (order.filter((code) => scores[code] === sortedValues[0]).length !== 1 || scores[primary] !== sortedValues[0] || chosen[0] !== secondary) return null;
  } else if (run.rank_scope === "primary") {
    if (chosen[0] !== primary || (candidates.length > 2 && chosen[1] !== secondary) || (candidates.length === 2 && !candidates.includes(secondary))) return null;
  } else return null;
  return { candidates, scope: run.rank_scope };
}

// Editorial thresholds use exact initial scores only; they never affect scoring.
export function identityInterpretation(primary: IdentityTieCode, secondary: IdentityTieCode, scores?: InitialNaturalScores | null, run?: IdentityTieRun | null): IdentityInterpretation {
  const tie = verifiedTie(run, scores, primary, secondary);
  if (tie?.scope === "primary") {
    const names = list(tie.candidates);
    if (tie.candidates.length === 4) return {
      subtitle: "Quatre tendances à égalité.",
      parts: [text("Dans tes réponses initiales, "), bold(names), text(" occupaient la même place. Les questions complémentaires ont retenu "), bold(profileNames[primary]), text(" puis "), bold(profileNames[secondary]), text(" pour les deux premières positions de la restitution, sans réduire l’importance des autres tendances.")],
    };
    if (tie.candidates.length === 3) return {
      subtitle: "Trois tendances à égalité.",
      parts: [text("Tes réponses initiales faisaient ressortir "), bold(names), text(" à égalité. Les questions complémentaires ont retenu "), bold(profileNames[primary]), text(" puis "), bold(profileNames[secondary]), text(" pour les deux premières positions de la restitution, sans effacer la troisième tendance.")],
    };
    return {
      subtitle: "Deux tendances à égalité.",
      parts: [text("Tes réponses initiales donnaient la même place à "), bold(names), text(". La question complémentaire a placé "), bold(profileNames[primary]), text(" en premier pour la restitution, sans diminuer l’autre tendance.")],
    };
  }
  if (tie?.scope === "secondary") return {
    subtitle: "Plusieurs tendances se partagent la deuxième place.",
    parts: [text("Ton profil principal, "), bold(profileNames[primary]), text(", était déjà identifié ; "), bold(list(tie.candidates)), text(" partageaient la deuxième place dans tes réponses initiales. "), text(tie.candidates.length === 2 ? "La question complémentaire a retenu " : "Les questions complémentaires ont retenu "), bold(profileNames[secondary]), text(" pour la restitution, sans effacer "), text(tie.candidates.length === 2 ? "l’autre tendance." : "les autres tendances.")],
  };

  const values = order.map((code) => scores?.[code]);
  const complete = values.every((value) => typeof value === "number" && Number.isFinite(value));
  const ranked = complete ? [...order].sort((a, b) => (scores?.[b] as number) - (scores?.[a] as number)) : [];
  const validRanks = ranked[0] === primary && ranked[1] === secondary &&
    (scores?.[primary] as number) > (scores?.[secondary] as number) &&
    (scores?.[secondary] as number) > (scores?.[ranked[2]] as number);
  const gap = validRanks ? (scores?.[primary] as number) - (scores?.[secondary] as number) : null;
  const subtitle = gap === null ? "Une lecture singulière de ton profil."
    : gap <= 2 ? "Deux tendances proches."
    : gap <= 5 ? "Une tendance se distingue."
    : "Une tendance nettement dominante.";
  return {
    subtitle,
    parts: [text(combinationCopy[primary][secondary] ?? "Découvre les nuances de ton profil dans la suite de ta restitution.")],
  };
}
