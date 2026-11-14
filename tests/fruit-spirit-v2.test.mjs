import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  calculateFruitSpiritV2,
  FRUIT_SPIRIT_RESTITUTION_VERSION,
  fruitSpiritAnswerScale,
  fruitSpiritFruitsV2,
  fruitSpiritLevelLabels,
  fruitSpiritQuestionIdsV2,
  fruitSpiritSituationsV2,
  isFruitSpiritV2Complete,
} from "../src/lib/apps/fruit-spirit-v2.ts";
import { fruitSpiritRestitutionsV2 } from "../src/lib/apps/fruit-spirit-restitutions-v2.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const expectedSituations = [
  {
    title: "Une personne te déçoit",
    context: "Tu avais confiance en quelqu'un, mais cette personne n'a pas tenu sa parole. Tu es déçu et tu dois décider comment réagir.",
  },
  {
    title: "Une journée où tout déborde",
    context: "Tu as beaucoup de choses à faire. Les imprévus s'accumulent, tu prends du retard et plusieurs personnes ont besoin de toi.",
  },
  {
    title: "Quand quelqu'un réussit à ta place",
    context: "Une personne de ton entourage obtient une opportunité que tu espérais depuis longtemps. Elle vient partager sa joie avec toi.",
  },
  {
    title: "Quand quelqu'un fait une erreur qui te pénalise",
    context: "Tu travailles sur un projet avec une autre personne. Elle commet une erreur qui te fait perdre du temps et t'oblige à refaire une partie du travail. Ce n'est pas la première fois.",
  },
  {
    title: "Une promesse qui devient difficile à tenir",
    context: "Tu as accepté de rendre un service à quelqu'un. Mais le moment venu, tu es fatigué, tu manques de temps et personne ne te relancera si tu ne fais rien.",
  },
  {
    title: "Une mauvaise nouvelle qui te déstabilise",
    context: "Tu reçois une nouvelle inquiétante concernant une situation importante pour toi. Tu n'as pas toutes les informations et tu dois attendre plusieurs jours avant d'en savoir davantage.",
  },
  {
    title: "Une personne que personne ne remarque",
    context: "Tu participes à un événement. Tout le monde discute en petits groupes, mais une personne reste seule à l'écart et semble mal à l'aise.",
  },
  {
    title: "Quand on te critique devant les autres",
    context: "Tu présentes une idée qui te tient à cœur devant un groupe. Une personne remet publiquement en question ton travail, avec un ton que tu trouves injuste.",
  },
  {
    title: "Quand les choses ne se passent pas comme tu l'espérais",
    context: "Tu t'es beaucoup investi dans un projet qui te tenait à cœur. Malgré tes efforts, le résultat est décevant et tu dois accepter que les choses ne se soient pas déroulées comme prévu.",
  },
];

const expectedQuestions = [
  "Quand quelqu'un me déçoit, est-ce que je continue à lui vouloir du bien, même si je suis blessé ?",
  "Avant de juger son comportement, est-ce que je prends le temps d'écouter ses explications ?",
  "Quand je lui exprime ma déception, est-ce que j'arrive à le faire sans chercher à le blesser ?",
  "Quand je suis débordé, est-ce que j'arrive à réfléchir avant de réagir sous le coup de l'agacement ?",
  "Même lorsque tout ne se passe pas comme prévu, est-ce que j'arrive à ne pas me laisser envahir par l'inquiétude ?",
  "Quand quelqu'un me ralentit alors que je suis pressé, est-ce que je continue à lui parler calmement ?",
  "Quand quelqu'un obtient ce que j'espérais, est-ce que j'arrive à me réjouir sincèrement pour lui ?",
  "Même si je suis déçu pour moi-même, est-ce que je prends le temps de célébrer sa réussite ?",
  "Quand une personne réussit, est-ce que je pose un geste concret pour l'encourager ou la soutenir ?",
  "Quand une personne répète une erreur, est-ce que j'arrive à rester patient avec elle ?",
  "Même si son erreur me coûte du temps, est-ce que je cherche à l'aider à progresser ?",
  "Avant de lui faire des reproches, est-ce que je cherche à comprendre ce qui l'a mise en difficulté ?",
  "Quand tenir une promesse me demande plus d'efforts que prévu, est-ce que je cherche à aller jusqu'au bout ?",
  "Quand je préférerais faire autre chose, est-ce que j'arrive à résister à l'envie de repousser mon engagement ?",
  "Quand je réalise que je ne pourrai pas tenir ma promesse, est-ce que je préviens rapidement la personne concernée ?",
  "Quand je ne sais pas ce qui va arriver, est-ce que j'arrive à ne pas imaginer systématiquement le pire ?",
  "Même pendant une période difficile, est-ce que j'arrive à reconnaître les bonnes choses qui se passent dans ma vie ?",
  "Quand l'inquiétude monte, est-ce que j'arrive à éviter de prendre des décisions précipitées ?",
  "Quand je remarque une personne isolée, est-ce que je prends l'initiative d'aller vers elle ?",
  "Quand une personne a besoin d'être écoutée, est-ce que je lui accorde du temps, même si cela ne m'arrange pas ?",
  "Quand quelqu'un semble mal à l'aise, est-ce que je fais attention à ne pas le mettre davantage dans l'embarras ?",
  "Quand quelqu'un me critique injustement, est-ce que j'arrive à exprimer mon désaccord sans chercher à le rabaisser ?",
  "Quand une personne critique mon idée, est-ce que je la laisse terminer avant de répondre ?",
  "Quand je réalise que je me suis trompé, est-ce que je reconnais mon erreur, même devant les autres ?",
  "Quand un projet échoue, est-ce que j'arrive à reconnaître ce que cette expérience m'a apporté ?",
  "Quand je ne peux plus changer le résultat d'une situation, est-ce que j'arrive progressivement à l'accepter ?",
  "Quand je suis déçu par un résultat collectif, est-ce que j'arrive à parler aux autres sans leur faire porter ma frustration ?",
];

test("la V2 contient exactement neuf situations et vingt-sept questions validées", () => {
  assert.equal(fruitSpiritSituationsV2.length, 9);
  assert.deepEqual(fruitSpiritSituationsV2.map(({ title, context }) => ({ title, context })), expectedSituations);
  assert.deepEqual(fruitSpiritSituationsV2.map((situation) => situation.questions.length), Array(9).fill(3));
  assert.deepEqual(fruitSpiritSituationsV2.flatMap((situation) => situation.questions.map((question) => question.prompt)), expectedQuestions);
  assert.deepEqual(fruitSpiritQuestionIdsV2, Array.from({ length: 27 }, (_, index) => `q${String(index + 1).padStart(2, "0")}`));
  assert.deepEqual(fruitSpiritAnswerScale.map(({ label }) => label), ["Jamais", "Rarement", "Parfois", "Souvent", "Presque toujours"]);
});

test("chaque fruit utilise exactement les trois questions fournies", () => {
  assert.deepEqual(Object.fromEntries(fruitSpiritFruitsV2.map((fruit) => [fruit.key, fruit.questionIds])), {
    amour: ["q01", "q08", "q20"],
    joie: ["q07", "q17", "q25"],
    paix: ["q05", "q16", "q26"],
    patience: ["q06", "q10", "q23"],
    bonte: ["q09", "q11", "q19"],
    bienveillance: ["q02", "q12", "q21"],
    fidelite: ["q13", "q15", "q24"],
    douceur: ["q03", "q22", "q27"],
    maitrise: ["q04", "q14", "q18"],
  });
  assert.equal(new Set(fruitSpiritFruitsV2.flatMap((fruit) => fruit.questionIds)).size, 27);
});

test("le calcul conserve la moyenne sur cinq et applique les seuils provisoires", () => {
  const answers = Object.fromEntries(fruitSpiritQuestionIdsV2.map((id) => [id, 5]));
  ["q01", "q08", "q20"].forEach((id) => { answers[id] = 4; });
  ["q07", "q17", "q25"].forEach((id) => { answers[id] = 3; });
  ["q05", "q16", "q26"].forEach((id) => { answers[id] = 2; });
  const result = calculateFruitSpiritV2(answers);
  assert.equal(result.complete, true);
  assert.equal(result.scores.amour, 4);
  assert.equal(result.scores.joie, 3);
  assert.equal(result.scores.paix, 2);
  assert.equal(result.levels.amour, "practice");
  assert.equal(result.levels.joie, "develop");
  assert.equal(result.levels.paix, "discover");
  assert.equal(result.provisionalThresholds, true);
  assert.deepEqual(fruitSpiritLevelLabels, {
    practice: "Ce fruit est déjà bien présent",
    develop: "Ce fruit est en train de grandir",
    discover: "Ce fruit commence à germer",
  });
  delete answers.q27;
  assert.equal(isFruitSpiritV2Complete(answers), false);
});

test("le questionnaire masque le fruit évalué et sauvegarde après chaque situation", () => {
  const component = read("src/components/apps/FruitSpiritJourney.tsx");
  const route = read("src/app/api/apps/grace-identity/route.ts");
  assert.match(component, /styles\.introTitle.*Fruit de l’Esprit/);
  assert.doesNotMatch(component, /NEUF SITUATIONS/);
  assert.doesNotMatch(component, /VINGT-SEPT QUESTIONS/);
  assert.doesNotMatch(component, /question\.fruit/);
  assert.match(component, /await onSave\(answers, completed\)/);
  assert.match(component, /Situation suivante/);
  assert.match(route, /isFruitSpiritV2Complete/);
  assert.match(route, /completed_at: completed \? new Date\(\)\.toISOString\(\) : null/);
});

test("la migration versionne sans écraser la V1 et garde une seule publication courante", () => {
  const migration = read("supabase/migrations/20261112013000_fruit_spirit_v2_versioning.sql");
  assert.match(migration, /fruit-spirit-v1-9/);
  assert.match(migration, /unique\(user_id, test_key, questionnaire_version\)/);
  assert.match(migration, /distinct on \(item\.test_key\)/);
  assert.match(migration, /restitution_version text/);
  assert.doesNotMatch(migration, /delete from public\.grace_identity_assessments/);
});

test("les vingt-sept restitutions validées sont présentes et complètes", () => {
  assert.equal(FRUIT_SPIRIT_RESTITUTION_VERSION, "fruit-spirit-v2-editorial-1");
  assert.deepEqual(fruitSpiritRestitutionsV2.map(({ key }) => key), fruitSpiritFruitsV2.map(({ key }) => key));
  assert.equal(fruitSpiritRestitutionsV2.length, 9);
  const levels = ["practice", "develop", "discover"];
  const restitutions = fruitSpiritRestitutionsV2.flatMap((fruit) => levels.map((level) => fruit.levels[level]));
  assert.equal(restitutions.length, 27);
  for (const fruit of fruitSpiritRestitutionsV2) {
    assert.ok(fruit.verse.length > 30);
    assert.ok(fruit.overview.length > 300);
    assert.doesNotMatch(fruit.overview, /<br|&nbsp;/i);
  }
  for (const restitution of restitutions) {
    assert.ok(restitution.discovery.length > 300);
    assert.ok(restitution.growth.length > 500);
    assert.ok(restitution.challengeTitle.length > 10);
    assert.ok(restitution.challenge.length > 100);
    assert.ok(restitution.reflection.endsWith("?"));
    assert.doesNotMatch(Object.values(restitution).join("\n"), /<br|&nbsp;/i);
  }
});

test("la page de résultats affiche le texte complet du niveau calculé", () => {
  const component = read("src/components/apps/FruitSpiritJourney.tsx");
  const route = read("src/app/api/apps/grace-identity/route.ts");
  assert.match(component, /fruitSpiritRestitutionByKeyV2/);
  assert.match(component, /Ce que tu peux découvrir sur toi/);
  assert.match(component, /Comment laisser ce fruit grandir \?/);
  assert.match(component, /Ton défi cette semaine/);
  assert.match(component, /Pour aller plus loin/);
  assert.doesNotMatch(component, /<details/);
  assert.doesNotMatch(component, /<summary/);
  assert.doesNotMatch(component, /styles\.restitutionHeader/);
  assert.match(component, /styles\.resultPager/);
  assert.match(component, /FRUIT SUIVANT/);
  assert.match(component, /Fruit \$\{resultStep \+ 1\} sur 9/);
  assert.match(component, /Choisir le fruit à consulter/);
  assert.match(component, /resultQuickNavActive/);
  assert.match(component, /styles\.restitutionAside/);
  assert.match(route, /FRUIT_SPIRIT_RESTITUTION_VERSION/);
});

test("les résultats commencent par les neuf fruits regroupés par niveau d’avancement", () => {
  const component = read("src/components/apps/FruitSpiritJourney.tsx");
  assert.match(component, /complete \? "overview" : "discover"/);
  assert.match(component, /resultLevelOrder\.map/);
  assert.match(component, /Le fruit de l’Esprit/);
  assert.match(component, /Mais le fruit de l’Esprit, c’est l’amour, la joie, la paix, la patience, la bonté, la bienveillance, la foi, la douceur, la maîtrise de soi/);
  assert.match(component, /Galates 5:22/);
  assert.match(component, /NIVEAU D’AVANCEMENT/);
  assert.match(component, /group\.fruits\.map/);
  assert.match(component, /Voir le détail/);
  assert.match(component, /setResultStep\(index\); setPage\("results"\)/);
  assert.match(component, /Vue d’ensemble des 9 fruits/);
});
