import assert from "node:assert/strict";
import test from "node:test";
import { MappAnswerQueue } from "../src/lib/mapp/answer-queue.ts";

function acknowledgement(mutation, revision) {
  return {
    appliedMutationId: mutation.mutationId,
    serverRevision: revision,
    savedAt: new Date(0).toISOString(),
    answerCount: mutation.answers.length,
    completed: false,
  };
}

test("cinq réponses produisent une seule mutation", async () => {
  const mutations = [];
  const queue = new MappAnswerQueue({
    attemptId: "attempt-1",
    serverRevision: 0,
    sender: async (mutation) => {
      mutations.push(mutation);
      return acknowledgement(mutation, 1);
    },
  });

  for (let index = 1; index <= 5; index += 1) {
    await queue.enqueue(`q-${index}`, index);
  }

  assert.equal(mutations.length, 1);
  assert.equal(mutations[0].answers.length, 5);
  assert.equal(queue.pendingCount, 0);
  assert.equal(queue.revision, 1);
});

test("une navigation force l'envoi d'un lot incomplet", async () => {
  const mutations = [];
  const queue = new MappAnswerQueue({
    attemptId: "attempt-2",
    serverRevision: 4,
    sender: async (mutation) => {
      mutations.push(mutation);
      return acknowledgement(mutation, 5);
    },
  });

  await queue.enqueue("q-1", 2);
  await queue.enqueue("q-2", 3);
  assert.equal(mutations.length, 0);
  await queue.flush(true);
  assert.equal(mutations.length, 1);
  assert.equal(mutations[0].answers.length, 2);
  assert.equal(mutations[0].expectedRevision, 4);
});

test("un retry conserve le même mutationId", async () => {
  const ids = [];
  let call = 0;
  const queue = new MappAnswerQueue({
    attemptId: "attempt-3",
    serverRevision: 0,
    sender: async (mutation) => {
      ids.push(mutation.mutationId);
      call += 1;
      if (call === 1) throw new Error("réseau interrompu");
      return acknowledgement(mutation, 1);
    },
  });

  for (let index = 1; index <= 4; index += 1) await queue.enqueue(`q-${index}`, index);
  await assert.rejects(() => queue.enqueue("q-5", 5), /réseau interrompu/);
  assert.equal(queue.pendingCount, 5);
  await queue.flush(true);
  assert.deepEqual(ids, [ids[0], ids[0]]);
  assert.equal(queue.pendingCount, 0);
});

test("une réponse plus récente n'est pas supprimée par l'accusé d'un ancien lot", async () => {
  let release;
  const wait = new Promise((resolve) => { release = resolve; });
  let firstMutation;
  const queue = new MappAnswerQueue({
    attemptId: "attempt-4",
    serverRevision: 0,
    sender: async (mutation) => {
      firstMutation ??= mutation;
      await wait;
      return acknowledgement(mutation, mutation.expectedRevision + 1);
    },
  });

  const initial = [1, 2, 3, 4].map((index) => queue.enqueue(`q-${index}`, index));
  await Promise.all(initial);
  const fifth = queue.enqueue("q-5", 5);
  await Promise.resolve();
  const newer = queue.enqueue("q-1", 99);
  release();
  await Promise.all([fifth, newer]);
  assert.equal(firstMutation.answers.find((answer) => answer.questionId === "q-1").value, 1);
  assert.equal(queue.pendingCount, 1);
  assert.equal(queue.snapshot().pending[0].value, 99);
});

test("un accusé perdu puis rejoué peut confirmer la révision déjà observée", async () => {
  const retryBatch = {
    attemptId: "attempt-5",
    mutationId: "44444444-4444-4444-8444-444444444444",
    expectedRevision: 3,
    clientSequence: 5,
    answers: [{ questionId: "q-1", value: 4 }],
    sequences: { "q-1": 5 },
  };
  const queue = new MappAnswerQueue({
    attemptId: "attempt-5",
    serverRevision: 4,
    restored: {
      attemptId: "attempt-5",
      serverRevision: 3,
      nextSequence: 5,
      pending: [{ questionId: "q-1", value: 4, sequence: 5 }],
      retryBatch,
    },
    sender: async (mutation) => acknowledgement(mutation, 4),
  });

  await queue.flush(true);
  assert.equal(queue.revision, 4);
  assert.equal(queue.pendingCount, 0);
});

test("une reprise continue après la dernière séquence enregistrée", async () => {
  let sent;
  const queue = new MappAnswerQueue({
    attemptId: "attempt-6",
    serverRevision: 7,
    initialSequence: 35,
    sender: async (mutation) => {
      sent = mutation;
      return acknowledgement(mutation, 8);
    },
  });

  await queue.enqueue("q-1", 5);
  await queue.flush(true);
  assert.equal(sent.clientSequence, 36);
});
