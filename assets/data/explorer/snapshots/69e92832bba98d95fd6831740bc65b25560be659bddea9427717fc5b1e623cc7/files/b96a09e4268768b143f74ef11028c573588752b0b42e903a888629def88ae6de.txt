// @coarising:contract(TaBridgeSettlement, stage=stage-2-cloze, evidence=E2)
// S1 Three-Phase Reconcile Effect Adapter for external TA submission & absence-proof-gated refund.
// Verified by the generic 8-scenario fault-injection TCK (TCK-01..TCK-08).

export interface EffectRecord {
  readonly payload: Readonly<Record<string, unknown>>;
  readonly status: 'PINNED' | 'PENDING_RECONCILE' | 'CONFIRMED' | 'COMPENSATED';
  readonly receiptId?: string;
  readonly reason?: string;
  readonly absenceProof?: string;
}

export interface DurableEffectStore {
  get(key: string): EffectRecord | null;
  put(key: string, record: EffectRecord): void;
  listPending(): Array<{ readonly key: string; readonly record: EffectRecord }>;
}

export interface ExternalTaGateway {
  execute(key: string, payload: Readonly<Record<string, unknown>>): { readonly outcome: string; readonly receiptId?: string; readonly reason?: string };
  queryStatus(key: string): { readonly status: string; readonly receiptId?: string; readonly reason?: string; readonly absenceProof?: string };
}

export interface DownstreamSettlementPort {
  recordConfirmed(key: string, evidence: unknown): void;
  triggerCompensation(key: string, evidence: unknown): void;
}

export interface TaEffectDeps {
  readonly store: DurableEffectStore;
  readonly external: ExternalTaGateway;
  readonly downstream: DownstreamSettlementPort;
}

export function createEffectAdapter({ store, external, downstream }: TaEffectDeps) {
  return {
    // @cloze:start(ta-effect-adapter)
    submit(key: string, payload: Readonly<Record<string, unknown>>) {
      const existing = store.get(key);
      if (existing) {
        if (JSON.stringify(existing.payload) !== JSON.stringify(payload)) {
          return { ok: false, code: 'PAYLOAD_CONFLICT' };
        }
        return { ok: true, replayed: true, status: existing.status };
      }

      store.put(key, { payload, status: 'PINNED' });
      const res = external.execute(key, payload);
      if (res.outcome === 'CONFIRMED') {
        store.put(key, { payload, status: 'CONFIRMED', receiptId: res.receiptId });
        downstream.recordConfirmed(key, res);
        return { ok: true, replayed: false, status: 'CONFIRMED' };
      }
      if (res.outcome === 'REJECTED') {
        store.put(key, { payload, status: 'COMPENSATED', reason: res.reason });
        downstream.triggerCompensation(key, res.reason);
        return { ok: true, replayed: false, status: 'COMPENSATED' };
      }
      // Timeout / UNKNOWN: NEVER blindly trigger compensation without explicit ABSENT proof
      store.put(key, { payload, status: 'PENDING_RECONCILE' });
      return { ok: true, replayed: false, status: 'PENDING_RECONCILE' };
    },

    reconcile(key: string) {
      const existing = store.get(key);
      if (!existing) {
        return { ok: false, code: 'UNKNOWN_ORIGINAL' };
      }
      if (existing.status === 'CONFIRMED' || existing.status === 'COMPENSATED') {
        return { ok: true, status: existing.status };
      }
      const q = external.queryStatus(key);
      if (q.status === 'CONFIRMED') {
        store.put(key, { ...existing, status: 'CONFIRMED', receiptId: q.receiptId });
        downstream.recordConfirmed(key, q);
        return { ok: true, status: 'CONFIRMED' };
      }
      if (q.status === 'ABSENT' && q.absenceProof) {
        store.put(key, { ...existing, status: 'COMPENSATED', absenceProof: q.absenceProof });
        downstream.triggerCompensation(key, q.absenceProof);
        return { ok: true, status: 'COMPENSATED' };
      }
      if (q.status === 'REJECTED') {
        store.put(key, { ...existing, status: 'COMPENSATED', reason: q.reason });
        downstream.triggerCompensation(key, q.reason);
        return { ok: true, status: 'COMPENSATED' };
      }
      return { ok: true, status: 'PENDING_RECONCILE' };
    },

    recoverAll() {
      const pending = store.listPending();
      let recoveredCount = 0;
      for (const item of pending) {
        const res = this.reconcile(item.key);
        if (res.ok && res.status !== 'PENDING_RECONCILE') {
          recoveredCount += 1;
        }
      }
      return { ok: true, recoveredCount };
    },

    ingestReceipt(key: string, receipt: { readonly outcome: string; readonly receiptId?: string; readonly reason?: string }) {
      const existing = store.get(key);
      if (!existing) {
        return { ok: false, code: 'UNKNOWN_ORIGINAL' };
      }
      if (existing.status === 'CONFIRMED' || existing.status === 'COMPENSATED') {
        return { ok: true, status: existing.status };
      }
      if (receipt.outcome === 'CONFIRMED') {
        store.put(key, { ...existing, status: 'CONFIRMED', receiptId: receipt.receiptId });
        downstream.recordConfirmed(key, receipt);
        return { ok: true, status: 'CONFIRMED' };
      }
      if (receipt.outcome === 'REJECTED') {
        store.put(key, { ...existing, status: 'COMPENSATED', reason: receipt.reason });
        downstream.triggerCompensation(key, receipt.reason);
        return { ok: true, status: 'COMPENSATED' };
      }
      return { ok: true, status: existing.status };
    },
    // @cloze:end(ta-effect-adapter)
  };
}
