import type { StateCreator } from "zustand";
import {
  AT_STAKE, caseCode, chanceBounds, currentChance, defaultQuestion, draftState, DUE_FOR, freshRun, needsPerson, QUESTIONS, SCRIBE_STEP,
  type CaseDraft, type CoverageSummary, type DocSlotId, type DraftDocument,
} from "@/data/cases";
import { payerById } from "@/data/seed";
import { uid } from "@/lib/format";
import { blankDraft, SEED_DRAFTS } from "@/pages/newcase/seedDrafts";
import type { AppState } from "./index";

/* New case drafts and Active Cases (owner: new-case agent).
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
  finishCaseDoc: (id: string, slot: DocSlotId) => void;
  setCaseCoverage: (id: string, coverage: CoverageSummary | null) => void;
  /** Save as draft: the case appears in Active Cases with its own ID. */
  saveCaseDraft: (id: string) => void;
  /** Start the agents (after the confirm). Sets the chance bounds, the clock for the request and which question Scribe may ask. */
  startCaseRun: (id: string) => void;
  advanceCaseRun: (id: string, seconds: number) => void;
  askCaseQuestion: (id: string) => void;
  answerCaseQuestion: (id: string, a: { choice: string; answer: string; note?: string }) => void;
  /** Send back to Scribe: Scribe, Integrity, Packet and Scrubber run again with the note. */
  rerunFromScribe: (id: string, note: string) => void;
  /** Sign and send. Returns the request ID that now shows on the Dashboard. */
  signCaseDraft: (id: string) => string | undefined;
}

const INTAKE_KEYS: (keyof CaseDraft)[] = ["patient", "payerId", "memberId", "program", "type", "startDate", "reason", "diagnoses", "documents"];
/** Changing the intake after the agents have worked means their work is stale, so the run starts over. */
function edit(d: CaseDraft, patch: Partial<CaseDraft>): CaseDraft {
  const stale = d.run.done > 0 && INTAKE_KEYS.some((k) => k in patch);
  return { ...d, ...patch, ...(stale ? { run: freshRun(), answers: [], narrative: null, suggestions: [], revision: 0, sendBackNote: undefined } : {}) };
}

export const createCasesSlice: StateCreator<AppState, [], [], CasesSlice> = (set, get) => {
  const update = (id: string, fn: (d: CaseDraft) => CaseDraft) => set((s) => ({ caseDrafts: s.caseDrafts.map((d) => (d.id === id ? fn(d) : d)) }));
  const find = (id: string) => get().caseDrafts.find((d) => d.id === id);

  return {
    caseDrafts: SEED_DRAFTS,
    caseSentToday: ["I-2231", "R-1088", "P-1611", "P-1637"],
    caseSeq: 1701,

    createCaseDraft: (init) => {
      const id = uid("draft");
      set((s) => ({ caseDrafts: [...s.caseDrafts, blankDraft({ ...init, id, updatedAt: s.clock })] }));
      return id;
    },
    patchCaseDraft: (id, patch) => update(id, (d) => edit(d, patch)),
    putCaseDocs: (id, docs) =>
      update(id, (d) => edit(d, { documents: [...d.documents.filter((x) => !docs.some((n) => n.slot === x.slot)), ...docs] })),
    dropCaseDoc: (id, slot) => update(id, (d) => edit(d, { documents: d.documents.filter((x) => x.slot !== slot) })),
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
        const conflict = d.documents.some((x) => x.slot === "meds" && x.findings.some((f) => !f.ok && f.resolvedBy === "sertraline"));
        return {
          ...d,
          step: 1,
          startChance: bounds.start,
          finalChance: bounds.final,
          questionKey: conflict ? "sertraline" : defaultQuestion(d.program),
          dueKind: d.dueKind ?? due?.kind ?? null,
          dueAt: d.dueAt ?? (due ? clock + due.in : null),
          ...(d.run.done === 0 ? { run: freshRun() } : {}),
        };
      });
    },

    advanceCaseRun: (id, seconds) => update(id, (d) => ({ ...d, run: { ...d.run, done: d.run.done + 1, elapsed: [...d.run.elapsed, seconds] } })),
    askCaseQuestion: (id) => update(id, (d) => (d.questionKey ? { ...d, run: { ...d.run, asked: true, question: d.questionKey } } : d)),

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

    rerunFromScribe: (id, note) =>
      update(id, (d) => ({
        ...d,
        step: 1,
        run: { done: SCRIBE_STEP, asked: true, question: null, elapsed: d.run.elapsed.slice(0, SCRIBE_STEP) },
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
        atStake: AT_STAKE[d.program],
        chance: currentChance(d),
        referralId: d.referralId,
      });
      set((s) => ({ caseDrafts: s.caseDrafts.map((x) => (x.id === id ? { ...x, sent: true, caseId: requestId } : x)), caseSentToday: [...s.caseSentToday, requestId] }));
      return requestId;
    },
  };
};

/** Sidebar badge: drafts that need a person. In the seed, two questions and one signature make 3. */
export const selectActiveBadge = (s: AppState): number => s.caseDrafts.filter((d) => d.saved && !d.sent && needsPerson(d)).length;
