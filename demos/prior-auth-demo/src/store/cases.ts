import type { StateCreator } from "zustand";
import { EMPTY_WORK } from "@/data/caseModel";
import { resolveCase } from "@/data/caseDetail";
import {
  caseCode, chanceBounds, currentChance, draftState, DUE_FOR, freshRun, needsPerson, QUESTIONS, RUN_STEPS, SCRIBE_STEP,
  type CaseDraft, type CoverageSummary, type DocSlotId, type DraftDocument,
} from "@/data/cases";
import { payerById } from "@/data/seed";
import type { AgentKey } from "@/data/types";
import { uid } from "@/lib/format";
import { draftForRequest, mergeRequestDraft, requestDraft, requestState } from "@/pages/newcase/fromRequest";
import { payerContextOf } from "@/pages/newcase/payerContext";
import { unmetCount } from "@/pages/newcase/payerRules";
import { pendingFor, planQuestions } from "@/pages/newcase/questions";
import { blankDraft, SEED_DRAFTS } from "@/pages/newcase/seedDrafts";
import type { AppState } from "./index";

/* New case drafts and Case Manager (owner: new-case agent).
   A draft is everything about one case being prepared: the intake, the documents, the agents' run, the answers, the summary.
   The pages never keep this in component state, so Back, Save as draft and "Resume" all work, and Reset demo data restores it. */
export interface CasesSlice {
  caseDrafts: CaseDraft[];
  /** IDs of requests sent today. Four were sent before the demo starts; Sign and send adds to it. */
  caseSentToday: string[];
  caseSeq: number;
  createCaseDraft: (init?: Partial<CaseDraft>) => string;
  patchCaseDraft: (id: string, patch: Partial<CaseDraft>) => void;
  putCaseDocs: (id: string, docs: DraftDocument[]) => void;
  dropCaseDoc: (id: string, slot: DocSlotId) => void;
  /** "Mark not available": the document is handled with a reason. The payer's list still asks for it, so the review warns when it is required. */
  markCaseDocUnavailable: (id: string, slot: DocSlotId, reason: string) => void;
  clearCaseDocUnavailable: (id: string, slot: DocSlotId) => void;
  finishCaseDoc: (id: string, slot: DocSlotId) => void;
  setCaseCoverage: (id: string, coverage: CoverageSummary | null) => void;
  /** Save as draft: the case appears in Case Manager with its own ID. */
  saveCaseDraft: (id: string) => void;
  /** Start the agents (after the confirm). Sets the chance bounds, the clock for the request and which questions the agents may ask. */
  startCaseRun: (id: string) => void;
  advanceCaseRun: (id: string, seconds: number) => void;
  /** The agent at this step stops and asks the next planned question. */
  askCaseQuestion: (id: string) => void;
  answerCaseQuestion: (id: string, a: { choice: string; answer: string; note?: string }) => void;
  /** An agent could not finish its step. The run holds until the person retries or skips it. */
  failCaseStep: (id: string, agent: AgentKey) => void;
  retryCaseStep: (id: string) => void;
  /** "Skip and note": the step counts as done, the review warns about it and the request's history says so. */
  skipCaseStep: (id: string) => void;
  /** Send back to Scribe: Scribe, Integrity, Packet and Scrubber run again with the note. */
  rerunFromScribe: (id: string, note: string) => void;
  /** Sign and send. Returns the request ID that now shows on the Dashboard. */
  signCaseDraft: (id: string) => string | undefined;
  /** The draft for a request that exists on the case page: made from the request's own data when there is none, brought up to date when there is.
      It is moved to the step that fits: Review and sign when the request is ready, Agents work when agents still have work to do. Returns its ID. */
  draftFromRequest: (requestId: string) => string;
  /** The payer's saved list or rules changed: count again what the case does not meet, so the approval chance follows. */
  refreshCaseUnmet: (id: string) => void;
}

const INTAKE_KEYS: (keyof CaseDraft)[] = ["patient", "payerId", "memberId", "program", "type", "startDate", "reason", "diagnoses", "documents", "unavailable"];
/** Changing the intake after the agents have worked means their work is stale, so the run starts over (the portal stays reached, so Verify does not fail twice). */
const staleReset = (d: CaseDraft): Partial<CaseDraft> => ({ run: { ...freshRun(), retried: d.run.retried }, answers: [], questions: [], narrative: null, suggestions: [], revision: 0, sendBackNote: undefined, recordsChanged: true });

export const createCasesSlice: StateCreator<AppState, [], [], CasesSlice> = (set, get) => {
  /** Every change goes through here, so the count of what the payer asks for and the case does not meet is always current. */
  const settle = (d: CaseDraft): CaseDraft => {
    const unmet = unmetCount(d, payerContextOf(get(), d), get().clock);
    return unmet === d.unmet ? d : { ...d, unmet };
  };
  const update = (id: string, fn: (d: CaseDraft) => CaseDraft) => set((s) => ({ caseDrafts: s.caseDrafts.map((d) => (d.id === id ? settle(fn(d)) : d)) }));
  const find = (id: string) => get().caseDrafts.find((d) => d.id === id);
  /** An edit of the medical records. When the agents already ran, their work is stale: the run starts over and the person is told. */
  const change = (id: string, make: (d: CaseDraft) => Partial<CaseDraft>) => {
    const d = find(id);
    if (!d) return;
    const patch = make(d);
    const stale = d.run.done > 0 && INTAKE_KEYS.some((k) => k in patch);
    update(id, (x) => ({ ...x, ...patch, ...(stale ? staleReset(x) : {}) }));
    if (stale) get().toast({ title: "Records changed after the agents ran", body: "Their work was cleared. The agents check again when you continue.", tone: "mid" });
  };

  return {
    caseDrafts: SEED_DRAFTS,
    caseSentToday: ["I-2231", "R-1088", "P-1611", "P-1637"],
    caseSeq: 1701,

    createCaseDraft: (init) => {
      const id = uid("draft");
      set((s) => ({ caseDrafts: [...s.caseDrafts, settle(blankDraft({ ...init, id, updatedAt: s.clock }))] }));
      return id;
    },
    patchCaseDraft: (id, patch) => change(id, () => patch),
    putCaseDocs: (id, docs) =>
      change(id, (d) => {
        const unavailable = { ...d.unavailable };
        for (const n of docs) delete unavailable[n.slot];
        return { documents: [...d.documents.filter((x) => !docs.some((n) => n.slot === x.slot)), ...docs], unavailable };
      }),
    dropCaseDoc: (id, slot) => change(id, (d) => ({ documents: d.documents.filter((x) => x.slot !== slot) })),
    markCaseDocUnavailable: (id, slot, reason) => change(id, (d) => ({ documents: d.documents.filter((x) => x.slot !== slot), unavailable: { ...d.unavailable, [slot]: reason.trim() } })),
    clearCaseDocUnavailable: (id, slot) =>
      change(id, (d) => {
        const unavailable = { ...d.unavailable };
        delete unavailable[slot];
        return { unavailable };
      }),
    finishCaseDoc: (id, slot) => update(id, (d) => ({ ...d, documents: d.documents.map((x) => (x.slot === slot ? { ...x, status: "done" } : x)) })),
    setCaseCoverage: (id, coverage) => update(id, (d) => ({ ...d, coverage })),

    saveCaseDraft: (id) => {
      const d = find(id);
      if (!d || d.saved) return;
      const seq = get().caseSeq;
      set((s) => ({ caseSeq: s.caseSeq + 1 }));
      update(id, (x) => ({ ...x, saved: true, caseId: x.caseId ?? caseCode(x.program, seq) }));
    },

    startCaseRun: (id) => {
      get().saveCaseDraft(id);
      const clock = get().clock;
      update(id, (d) => {
        const bounds = chanceBounds(d.payerId);
        const due = d.type ? DUE_FOR[d.type] : undefined;
        return {
          ...d,
          step: 1,
          startChance: bounds.start,
          finalChance: bounds.final,
          questions: planQuestions(d),
          dueKind: d.dueKind ?? due?.kind ?? null,
          dueAt: d.dueAt ?? (due ? clock + due.in : null),
          ...(d.run.done === 0 ? { run: { ...freshRun(), retried: d.run.retried } } : {}),
        };
      });
    },

    advanceCaseRun: (id, seconds) =>
      update(id, (d) => {
        const done = d.run.done + 1;
        return { ...d, recordsChanged: done >= RUN_STEPS.length ? false : d.recordsChanged, run: { ...d.run, done, asked: false, elapsed: [...d.run.elapsed, seconds] } };
      }),
    askCaseQuestion: (id) =>
      update(id, (d) => {
        const step = RUN_STEPS[d.run.done];
        const next = step ? pendingFor(d, step.agent)[0] : undefined;
        return next ? { ...d, run: { ...d.run, asked: true, question: next } } : d;
      }),

    answerCaseQuestion: (id, a) => {
      const d = find(id);
      if (!d?.run.question) return;
      const def = QUESTIONS[d.run.question];
      const payer = d.payerId ? payerById(d.payerId).shortName : "the payer";
      update(id, (x) => ({
        ...x,
        run: { ...x.run, asked: true, question: null },
        answers: [...x.answers, { key: def.key, agent: def.agent, question: def.text(payer), choice: a.choice, answer: a.answer, note: a.note }],
        narrative: null,
      }));
    },

    failCaseStep: (id, agent) => update(id, (d) => ({ ...d, run: { ...d.run, failed: agent } })),
    retryCaseStep: (id) => update(id, (d) => ({ ...d, run: { ...d.run, failed: null, retried: true } })),
    skipCaseStep: (id) =>
      update(id, (d) => {
        const agent = d.run.failed;
        if (!agent) return d;
        return { ...d, run: { ...d.run, failed: null, done: d.run.done + 1, asked: false, elapsed: [...d.run.elapsed, 1], skipped: [...d.run.skipped, agent] } };
      }),

    rerunFromScribe: (id, note) =>
      update(id, (d) => ({
        ...d,
        step: 1,
        run: { ...d.run, done: SCRIBE_STEP, asked: true, question: null, failed: null, elapsed: d.run.elapsed.slice(0, SCRIBE_STEP) },
        narrative: null,
        revision: d.revision + 1,
        sendBackNote: note.trim() || undefined,
      })),

    signCaseDraft: (id) => {
      const d = find(id);
      if (!d || !d.payerId || !d.program || !d.type || draftState(d) !== "ready") return undefined;
      const requestId = get().submitCase({
        caseId: d.caseId ?? undefined,
        patient: { initials: d.patient.initials, age: d.patient.age ?? 0 },
        payerId: d.payerId,
        program: d.program,
        type: d.type,
        chance: currentChance(d),
        referralId: d.referralId,
      });
      if (d.run.skipped.includes("verify")) get().addEvent(requestId, { actor: "verify", text: `Verify could not reach ${payerById(d.payerId).shortName}'s portal before signing`, detail: "Coverage was not confirmed. You skipped it and noted it." });
      set((s) => ({ caseDrafts: s.caseDrafts.map((x) => (x.id === id ? { ...x, sent: true, caseId: requestId } : x)), caseSentToday: [...s.caseSentToday, requestId] }));
      return requestId;
    },

    draftFromRequest: (requestId) => {
      const st = get();
      const detail = resolveCase(requestId, st.requests);
      const existing = draftForRequest(st.caseDrafts, requestId, detail?.requestId);
      /* A request the app cannot describe still opens a draft, at Medical records, never a blank one at Referral. */
      if (!detail) return existing?.id ?? get().createCaseDraft({ caseId: requestId, phase: "records" });
      const work = st.queueCases[detail.requestId] ?? EMPTY_WORK;
      const target = requestDraft(detail, work, st.clock, payerContextOf(st, detail));
      if (!existing) {
        const id = uid("draft");
        set((s) => ({ caseDrafts: [...s.caseDrafts, settle({ ...target, id, updatedAt: s.clock })] }));
        return id;
      }
      update(existing.id, (d) => mergeRequestDraft(d, target, requestState(detail, work)));
      return existing.id;
    },

    refreshCaseUnmet: (id) => update(id, (d) => d),
  };
};

/** Sidebar badge: drafts that need a person. In the seed, two questions and one signature make 3. */
export const selectActiveBadge = (s: AppState): number => s.caseDrafts.filter((d) => d.saved && !d.sent && needsPerson(d)).length;
