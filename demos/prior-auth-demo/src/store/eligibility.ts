import type { StateCreator } from "zustand";
import { needsCaller, simulateCheck, SEED_EB_PATIENTS, VERDICT_LABEL, VERDICT_TONE, verdictOf, type EbPatient } from "@/data/eligibility";
import type { PayerId, Program } from "@/data/types";
import { clockTime, toDate } from "@/lib/time";
import { paths } from "@/routes";
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
  /** Verify re-checks, on its own, every row whose re-check time has passed. Does nothing while Verify is paused in Settings.
      `at` is the time it ran: the scheduled time when the clock jumped over it, or now when Verify was resumed. */
  ebRunDue: (at: "scheduled" | "now") => void;
  /** The Verify page calls this when the live check finishes. Updates a known patient or adds one. Returns the ID to show. */
  ebApplyCheck: (input: VerifyInput) => string;
}

const RECHECK_MS = 1100;
const SAMPLE_TAIL = "4821";

export const createEligibilitySlice: StateCreator<AppState, [], [], EligibilitySlice> = (set, get, api) => {
  /* The demo clock only moves from the Demo menu, so the slice listens for it: re-checks happen wherever the person is.
     Resuming Verify catches up with whatever came due while it was paused. */
  api.subscribe((s, prev) => {
    if (s.clock > prev.clock) s.ebRunDue("scheduled");
    else if (prev.agentPaused.verify && !s.agentPaused.verify) s.ebRunDue("now");
  });

  return {
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
          ebPatients: s.ebPatients.map((x) => (x.id === id ? { ...x, checkedAt: clock, recheckDue: false, recheckAt: undefined, autoAt: undefined } : x)),
        }));
        if (!p) return;
        const v = verdictOf(p);
        const phone = needsCaller(p.payerId) ? "The plan's system did not answer, so Caller phoned. " : "";
        get().toast({ title: `${id} re-checked`, body: `${phone}Still ${VERDICT_LABEL[v]}.`, tone: VERDICT_TONE[v] });
      }, RECHECK_MS);
    },

    ebRunDue: (at) => {
      const { ebPatients, clock, agentPaused } = get();
      if (agentPaused.verify) return;
      const due = ebPatients.filter((p) => p.recheckDue && p.recheckAt !== undefined && p.recheckAt <= clock);
      if (!due.length) return;
      const ranAt = (p: EbPatient): number => (at === "now" ? clock : (p.recheckAt ?? clock));
      set((s) => ({ ebPatients: s.ebPatients.map((p) => (due.some((d) => d.id === p.id) ? { ...p, checkedAt: ranAt(p), autoAt: ranAt(p), recheckDue: false, recheckAt: undefined } : p)) }));
      const one = due.length === 1 ? due[0] : null;
      if (one) {
        const v = verdictOf(one);
        get().notify({ agent: "verify", title: "Re-checked automatically", body: `${one.id} is still ${VERDICT_LABEL[v]}. Verify re-checked it at ${clockTime(toDate(ranAt(one)))}.`, to: paths.eligibilityResult(one.id), tone: VERDICT_TONE[v] });
      } else {
        get().notify({ agent: "verify", title: `Re-checked ${due.length} patients automatically`, body: `${due.map((p) => p.id).join(", ")} came due. None of the verdicts changed.`, to: paths.eligibility(), tone: "neutral" });
      }
    },

    ebApplyCheck: (input) => {
      const { ebPatients, clock, ebSeq } = get();
      const sample = input.payerId === "summit" && input.program === "RES" && input.memberId.replace(/\D/g, "").endsWith(SAMPLE_TAIL);
      const known = ebPatients.find((p) => p.id === input.caseId) ?? (sample ? ebPatients.find((p) => p.id === "R-1042") : undefined);
      if (known) {
        set((s) => ({ ebPatients: s.ebPatients.map((p) => (p.id === known.id ? { ...p, checkedAt: clock, recheckDue: false, recheckAt: undefined, autoAt: undefined, dos: input.dos } : p)) }));
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
  };
};

/** Sidebar badge: patients who need an authorization first or a fix before billing (4 + 5 = 9 in the seed). */
export const selectEbBadge = (s: AppState): number => s.ebPatients.filter((p) => verdictOf(p) !== "cleared").length;
