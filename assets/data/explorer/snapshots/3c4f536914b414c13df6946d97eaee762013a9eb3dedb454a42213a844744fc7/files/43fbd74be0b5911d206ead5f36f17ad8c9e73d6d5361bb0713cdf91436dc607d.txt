// Handwritten S1 Effect Adapter isolation-zone skeleton for TaBridgeSettlementEffect (protocol: three-phase-reconcile)
// Complete and verify with: truthsrc run-tck-v2 --adapter <path> --protocol three-phase-reconcile

export interface EffectRecord {
  readonly payload: Readonly<Record<string, unknown>>;
  readonly status: "PINNED" | "PENDING_RECONCILE" | "CONFIRMED" | "COMPENSATED";
  readonly receiptId?: string;
  readonly reason?: string;
  readonly absenceProof?: string;
}

export interface DurableEffectStore {
  get(key: string): EffectRecord | null;
  put(key: string, record: EffectRecord): void;
  listPending(): Array<{ readonly key: string; readonly record: EffectRecord }>;
}

export interface ExternalEffectGateway {
  execute(key: string, payload: Readonly<Record<string, unknown>>): { readonly outcome: string; readonly receiptId?: string; readonly reason?: string };
  queryStatus(key: string): { readonly status: string; readonly receiptId?: string; readonly reason?: string; readonly absenceProof?: string };
}

export interface DownstreamEffectPort {
  recordConfirmed(key: string, evidence: unknown): void;
  triggerCompensation(key: string, evidence: unknown): void;
}

export interface EffectAdapterDeps {
  readonly store: DurableEffectStore;
  readonly external: ExternalEffectGateway;
  readonly downstream: DownstreamEffectPort;
}

export function createEffectAdapter({ store, external, downstream }: EffectAdapterDeps) {
  return {
    submit(key: string, payload: Readonly<Record<string, unknown>>) {
      const existing = store.get(key);
      if (existing) {
        if (JSON.stringify(existing.payload) !== JSON.stringify(payload)) {
          return { ok: false, code: "PAYLOAD_CONFLICT" };
        }
        return { ok: true, replayed: true, status: existing.status };
      }
      store.put(key, { payload, status: "PINNED" });
      const res = external.execute(key, payload);
      if (res.outcome === "CONFIRMED") {
        store.put(key, { payload, status: "CONFIRMED", receiptId: res.receiptId });
        downstream.recordConfirmed(key, res);
        return { ok: true, replayed: false, status: "CONFIRMED" };
      }
      if (res.outcome === "REJECTED") {
        store.put(key, { payload, status: "COMPENSATED", reason: res.reason });
        downstream.triggerCompensation(key, res.reason);
        return { ok: true, replayed: false, status: "COMPENSATED" };
      }
      store.put(key, { payload, status: "PENDING_RECONCILE" });
      return { ok: true, replayed: false, status: "PENDING_RECONCILE" };
    },

    reconcile(key: string) {
      const existing = store.get(key);
      if (!existing) return { ok: false, code: "UNKNOWN_ORIGINAL" };
      if (existing.status === "CONFIRMED" || existing.status === "COMPENSATED") {
        return { ok: true, status: existing.status };
      }
      const q = external.queryStatus(key);
      if (q.status === "CONFIRMED") {
        store.put(key, { ...existing, status: "CONFIRMED", receiptId: q.receiptId });
        downstream.recordConfirmed(key, q);
        return { ok: true, status: "CONFIRMED" };
      }
      if (q.status === "ABSENT" && q.absenceProof) {
        store.put(key, { ...existing, status: "COMPENSATED", absenceProof: q.absenceProof });
        downstream.triggerCompensation(key, q.absenceProof);
        return { ok: true, status: "COMPENSATED" };
      }
      if (q.status === "REJECTED") {
        store.put(key, { ...existing, status: "COMPENSATED", reason: q.reason });
        downstream.triggerCompensation(key, q.reason);
        return { ok: true, status: "COMPENSATED" };
      }
      return { ok: true, status: "PENDING_RECONCILE" };
    },

    recoverAll() {
      let recoveredCount = 0;
      for (const item of store.listPending()) {
        const res = this.reconcile(item.key);
        if (res.ok && res.status !== "PENDING_RECONCILE") recoveredCount += 1;
      }
      return { ok: true, recoveredCount };
    },
  };
}
