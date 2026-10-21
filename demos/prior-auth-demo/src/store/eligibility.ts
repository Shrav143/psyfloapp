import type { StateCreator } from "zustand";
import { needsCaller, simulateCheck, SEED_EB_PATIENTS, VERDICT_LABEL, VERDICT_TONE, verdictOf, type EbPatient } from "@/data/eligibility";
import type { PayerId, Program } from "@/data/types";
import type { AppState } from "./index";

/* Eligibility and Benefits checks (owner: new-case agent). */
export interface VerifyInput {
  payerId: PayerId;
  program: Program;
  memberId: string;
  dos: string;
  caseId?: string;
  initials?: string | null;
  age?: number | null;
}

export interface EligibilitySlice {
  ebPatients: EbPatient[];
  /** IDs with a re-check in flight (the row shows a spinner). */
  ebRechecking: string[];
  ebSeq: number;
  /** Re-check one row. The answer may change nothing: R-1101 stays lapsed. */
  ebRecheck: (id: string) => void;
  /** The Verify page calls this when the live check finishes. Updates a known patient or adds one. Returns the ID to show. */
  ebApplyCheck: (input: VerifyInput) => string;
}

const RECHECK_MS = 1100;
const SAMPLE_TAIL = "4821";

export const createEligibilitySlice: StateCreator<AppState, [], [], EligibilitySlice> = (set, get) => ({
  ebPatients: SEED_EB_PATIENTS,
  ebRechecking: [],
  ebSeq: 1001,

  ebRecheck: (id) => {
    if (get().ebRechecking.includes(id)) return;
    set((s) => ({ ebRechecking: [...s.ebRechecking, id] }));
    setTimeout(() => {
      const p = get().ebPatients.find((x) => x.id === id);
      const clock = get().clock;
      set((s) => ({
        ebRechecking: s.ebRechecking.filter((x) => x !== id),
        ebPatients: s.ebPatients.map((x) => (x.id === id ? { ...x, checkedAt: clock, recheckDue: false } : x)),
      }));
      if (!p) return;
      const v = verdictOf(p);
      const phone = needsCaller(p.payerId) ? "The plan's system did not answer, so Caller phoned. " : "";
      get().toast({ title: `${id} re-checked`, body: `${phone}Still ${VERDICT_LABEL[v]}.`, tone: VERDICT_TONE[v] });
    }, RECHECK_MS);
  },

  ebApplyCheck: (input) => {
    const { ebPatients, clock, ebSeq } = get();
    const sample = input.payerId === "summit" && input.program === "RES" && input.memberId.replace(/\D/g, "").endsWith(SAMPLE_TAIL);
    const known = ebPatients.find((p) => p.id === input.caseId) ?? (sample ? ebPatients.find((p) => p.id === "R-1042") : undefined);
    if (known) {
      set((s) => ({ ebPatients: s.ebPatients.map((p) => (p.id === known.id ? { ...p, checkedAt: clock, recheckDue: false, dos: input.dos } : p)) }));
      return known.id;
    }
    const id = `V-${ebSeq}`;
    const fresh: EbPatient = {
      id,
      initials: input.initials ?? null,
      age: input.age ?? null,
      payerId: input.payerId,
      program: input.program,
      memberMasked: `…${input.memberId.replace(/\W/g, "").slice(-4)}`,
      ...simulateCheck(input),
      dos: input.dos,
      checkedAt: clock,
      recheckDue: false,
    };
    set((s) => ({ ebPatients: [fresh, ...s.ebPatients], ebSeq: s.ebSeq + 1 }));
    return id;
  },
});

/** Sidebar badge: patients who need an authorization first or a fix before billing (4 + 2 = 6 in the seed). */
export const selectEbBadge = (s: AppState): number => s.ebPatients.filter((p) => verdictOf(p) !== "cleared").length;
