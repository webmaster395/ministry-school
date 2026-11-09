import assert from "node:assert/strict";
import test from "node:test";
import {
  classifySpiritualGifts,
  giftScaleLabels,
  spiritualGiftQuestionOrder,
  spiritualGiftQuestions,
  spiritualGiftsV2,
} from "../src/lib/apps/spiritual-gifts-v2.ts";

const answersAt = (value) => Object.fromEntries(spiritualGiftQuestions.map((question) => [question.id, value]));
const categoryOf = (answers, giftId) => classifySpiritualGifts(answers).find((gift) => gift.id === giftId)?.category;

test("le questionnaire contient exactement les 21 questions validées dans l’ordre imposé", () => {
  assert.equal(spiritualGiftQuestions.length, 21);
  assert.deepEqual(spiritualGiftQuestions.map((question) => question.id), [...spiritualGiftQuestionOrder]);
  assert.deepEqual(giftScaleLabels, ["Jamais", "Très rarement", "Rarement", "Parfois", "Souvent", "Très souvent"]);
});

test("chaque don possède trois questions, une preuve concrète, une définition et un défi", () => {
  assert.equal(spiritualGiftsV2.length, 7);
  spiritualGiftsV2.forEach((gift) => {
    assert.equal(gift.questions.length, 3);
    assert.ok(gift.evidenceDimensions.length >= 1);
    assert.ok(gift.definition.length > 30);
    assert.ok(gift.challenge.length > 30);
  });
});

test("une pratique de guérison sans amélioration observée reste à développer", () => {
  const answers = answersAt(0);
  Object.assign(answers, { guer_1: 5, guer_2: 5, guer_3: 0 });
  assert.equal(categoryOf(answers, "guerison"), "developing");
});

test("des impressions sans confirmation ne suffisent pas pour classer le discernement comme exercé", () => {
  const answers = answersAt(0);
  Object.assign(answers, { disc_1: 5, disc_2: 5, disc_3: 1 });
  assert.equal(categoryOf(answers, "discernement"), "developing");
});

test("sollicitation, expérience et confirmation fortes indiquent un exercice de la sagesse", () => {
  const answers = answersAt(0);
  Object.assign(answers, { sag_1: 5, sag_2: 4, sag_3: 5 });
  assert.equal(categoryOf(answers, "sagesse"), "exercised");
});

test("les profils contrastés produisent les trois chapitres attendus", () => {
  assert.ok(classifySpiritualGifts(answersAt(5)).every((gift) => gift.category === "exercised"));
  assert.ok(classifySpiritualGifts(answersAt(3)).every((gift) => gift.category === "developing"));
  assert.ok(classifySpiritualGifts(answersAt(0)).every((gift) => gift.category === "less_visible"));
});

test("l’interprétation change réellement selon les trois réponses", () => {
  const first = answersAt(0);
  Object.assign(first, { conn_1: 5, conn_2: 3, conn_3: 1 });
  const second = answersAt(0);
  Object.assign(second, { conn_1: 2, conn_2: 5, conn_3: 4 });
  const firstResult = classifySpiritualGifts(first).find((gift) => gift.id === "connaissance");
  const secondResult = classifySpiritualGifts(second).find((gift) => gift.id === "connaissance");
  const firstText = firstResult?.interpretation;
  const secondText = secondResult?.interpretation;
  assert.notEqual(firstText, secondText);
  assert.equal(firstResult?.editorialPath, "unverified");
  assert.equal(secondResult?.editorialPath, "grounded");
  assert.match(firstText ?? "", /apprendre à distinguer/);
  assert.match(secondText ?? "", /approfondies avec humilité/);
});

test("aucune restitution ne répète les notes ou les étiquettes du questionnaire", () => {
  for (const value of [0, 1, 2, 3, 4, 5]) {
    for (const gift of classifySpiritualGifts(answersAt(value))) {
      const copy = [gift.impact, gift.interpretation, gift.growth, gift.challenge].join(" ");
      assert.doesNotMatch(copy, /ta réponse la plus (forte|faible)|selon ton score|tu as obtenu|très souvent selon/i);
    }
  }
});

test("chaque parcours propose un accompagnement et un défi propres au don", () => {
  const result = classifySpiritualGifts(answersAt(5));
  result.forEach((gift) => {
    assert.ok(gift.impactTitle.length > 25);
    assert.ok(gift.interpretation.length > 100);
    assert.ok(gift.growth.length > 100);
    assert.ok(gift.challengeTitle.length > 15);
    assert.ok(gift.challenge.length > 100);
  });
});

test("les quatre parcours éditoriaux sont disponibles pour chacun des sept dons", () => {
  for (const giftDefinition of spiritualGiftsV2) {
    const evidenceIds = new Set(
      giftDefinition.questions
        .filter((question) => giftDefinition.evidenceDimensions.includes(question.dimension))
        .map((question) => question.id),
    );
    const unverified = answersAt(0);
    giftDefinition.questions.forEach((question) => {
      unverified[question.id] = evidenceIds.has(question.id) ? 1 : 5;
    });

    const scenarios = [
      [answersAt(5), "grounded"],
      [unverified, "unverified"],
      [answersAt(3), "emerging"],
      [answersAt(0), "quiet"],
    ];
    for (const [answers, expectedPath] of scenarios) {
      const result = classifySpiritualGifts(answers).find((gift) => gift.id === giftDefinition.id);
      assert.equal(result?.editorialPath, expectedPath, `${giftDefinition.id} doit proposer le parcours ${expectedPath}`);
      assert.ok((result?.challenge ?? "").length > 100);
    }
  }
});
