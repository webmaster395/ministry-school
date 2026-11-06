import type {
  MappAnswerMutation,
  MappAnswerValue,
  MappSaveAcknowledgement,
} from "./types";

type PendingAnswer = {
  questionId: string;
  value: MappAnswerValue;
  sequence: number;
};

type PersistedBatch = MappAnswerMutation & {
  sequences: Record<string, number>;
};

export type MappQueueSnapshot = {
  attemptId: string;
  serverRevision: number;
  nextSequence: number;
  pending: PendingAnswer[];
  retryBatch: PersistedBatch | null;
};

export type MappQueueSender = (mutation: MappAnswerMutation) => Promise<MappSaveAcknowledgement>;
export type MappQueuePersistence = (snapshot: MappQueueSnapshot) => void | Promise<void>;

function newMutationId() {
  return globalThis.crypto.randomUUID();
}

export class MappAnswerQueue {
  readonly attemptId: string;
  readonly batchSize: number;

  private serverRevision: number;
  private nextSequence: number;
  private pending = new Map<string, PendingAnswer>();
  private retryBatch: PersistedBatch | null = null;
  private inFlight: Promise<MappSaveAcknowledgement | null> | null = null;

  constructor({
    attemptId,
    serverRevision,
    sender,
    persist = () => undefined,
    batchSize = 5,
    initialSequence = 0,
    restored,
  }: {
    attemptId: string;
    serverRevision: number;
    sender: MappQueueSender;
    persist?: MappQueuePersistence;
    batchSize?: number;
    initialSequence?: number;
    restored?: MappQueueSnapshot | null;
  }) {
    if (!attemptId) throw new Error("attemptId requis");
    if (!Number.isInteger(serverRevision) || serverRevision < 0) throw new Error("serverRevision invalide");
    if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 5) throw new Error("batchSize invalide");
    if (!Number.isInteger(initialSequence) || initialSequence < 0) throw new Error("initialSequence invalide");

    this.attemptId = attemptId;
    this.serverRevision = serverRevision;
    this.nextSequence = initialSequence;
    this.sender = sender;
    this.persist = persist;
    this.batchSize = batchSize;

    if (restored?.attemptId === attemptId) {
      this.serverRevision = Math.max(serverRevision, restored.serverRevision);
      this.nextSequence = Math.max(initialSequence, restored.nextSequence);
      restored.pending.forEach((answer) => this.pending.set(answer.questionId, answer));
      this.retryBatch = restored.retryBatch;
    }
  }

  private readonly sender: MappQueueSender;
  private readonly persist: MappQueuePersistence;

  get pendingCount() {
    return this.pending.size;
  }

  get revision() {
    return this.serverRevision;
  }

  snapshot(): MappQueueSnapshot {
    return {
      attemptId: this.attemptId,
      serverRevision: this.serverRevision,
      nextSequence: this.nextSequence,
      pending: Array.from(this.pending.values()).sort((a, b) => a.sequence - b.sequence),
      retryBatch: this.retryBatch,
    };
  }

  async enqueue(questionId: string, value: MappAnswerValue) {
    if (!questionId) throw new Error("questionId requis");
    const answer: PendingAnswer = { questionId, value, sequence: ++this.nextSequence };
    this.pending.set(questionId, answer);
    await this.persist(this.snapshot());
    if (this.pending.size >= this.batchSize) await this.flush();
  }

  async flush(force = false): Promise<MappSaveAcknowledgement | null> {
    if (this.inFlight) return this.inFlight;
    if (!this.retryBatch && (!this.pending.size || (!force && this.pending.size < this.batchSize))) return null;

    this.inFlight = this.sendNextBatch().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  async flushAll() {
    let last: MappSaveAcknowledgement | null = null;
    while (this.pending.size || this.retryBatch) last = await this.flush(true);
    return last;
  }

  private buildBatch(): PersistedBatch {
    const answers = Array.from(this.pending.values())
      .sort((a, b) => a.sequence - b.sequence)
      .slice(0, this.batchSize);
    const clientSequence = Math.max(...answers.map((answer) => answer.sequence));
    return {
      attemptId: this.attemptId,
      mutationId: newMutationId(),
      expectedRevision: this.serverRevision,
      clientSequence,
      answers: answers.map(({ questionId, value }) => ({ questionId, value })),
      sequences: Object.fromEntries(answers.map(({ questionId, sequence }) => [questionId, sequence])),
    };
  }

  private async sendNextBatch() {
    const batch = this.retryBatch ?? this.buildBatch();
    this.retryBatch = batch;
    await this.persist(this.snapshot());

    const acknowledgement = await this.sender(batch);
    if (acknowledgement.appliedMutationId !== batch.mutationId) {
      throw new Error("Accusé de réception MAPP invalide");
    }
    // Une réponse HTTP peut être perdue après le commit. Au rechargement,
    // l'ouverture renvoie alors déjà la révision acquittée, tandis que le
    // navigateur rejoue le même mutationId. L'égalité confirme précisément
    // ce rejeu idempotent ; seule une révision plus ancienne est incohérente.
    if (acknowledgement.serverRevision < this.serverRevision) {
      throw new Error("Révision serveur MAPP invalide");
    }

    this.serverRevision = acknowledgement.serverRevision;
    Object.entries(batch.sequences).forEach(([questionId, sequence]) => {
      if ((this.pending.get(questionId)?.sequence ?? -1) <= sequence) this.pending.delete(questionId);
    });
    this.retryBatch = null;
    await this.persist(this.snapshot());
    return acknowledgement;
  }
}

export function createMappLocalStoragePersistence(storageKey: string): {
  load: () => MappQueueSnapshot | null;
  save: MappQueuePersistence;
  clear: () => void;
} {
  return {
    load() {
      if (typeof window === "undefined") return null;
      try {
        const value = window.localStorage.getItem(storageKey);
        return value ? JSON.parse(value) as MappQueueSnapshot : null;
      } catch {
        return null;
      }
    },
    save(snapshot) {
      if (typeof window !== "undefined") window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
    },
    clear() {
      if (typeof window !== "undefined") window.localStorage.removeItem(storageKey);
    },
  };
}
