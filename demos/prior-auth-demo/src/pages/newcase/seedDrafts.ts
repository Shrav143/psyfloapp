/* The five Dashboard "Preparing" requests as drafts, each at the step it is on, plus the blank draft a new case starts from. */
import { freshRun, PLAN_TYPE, QUESTIONS, type Answer, type CaseDraft, type DocSlotId, type QuestionKey } from "@/data/cases";
import type { PayerId, Program } from "@/data/types";
import { makeDocument, requiredDocs, sampleFile } from "./documents";
import { ICD_CODES } from "./lookups";

export function blankDraft(over: Partial<CaseDraft> = {}): CaseDraft {
  return {
    id: "",
    caseId: null,
    saved: false,
    sent: false,
    step: 0,
    phase: "referral",
    patient: { initials: "", age: null },
    reference: "",
    payerId: null,
    planType: "",
    state: "Ohio",
    memberId: "",
    cardRead: false,
    program: null,
    type: null,
    startDate: "2026-10-20",
    reason: "",
    diagnoses: [],
    documents: [],
    coverage: null,
    run: freshRun(),
    answers: [],
    questionKey: null,
    suggestions: [],
    narrative: null,
    revision: 0,
    startChance: 62,
    finalChance: 88,
    dueKind: null,
    dueAt: null,
    updatedAt: 0,
    ...over,
  };
}

const dx = (...codes: string[]) => ICD_CODES.filter((c) => codes.includes(c.code));
/** The sample documents for a payer and level of care, minus the ones the chart does not have. */
function docs(payer: PayerId, program: Program, skip: DocSlotId[] = [], sertralineConflict = false) {
  return requiredDocs(payer, program)
    .filter((r) => !skip.includes(r.slot))
    .map((r) => makeDocument(r.slot, sampleFile(r.slot), sertralineConflict, "done"));
}
const answer = (key: QuestionKey, choice: string, label: string, payerShort: string): Answer => ({ key, agent: QUESTIONS[key].agent, question: QUESTIONS[key].text(payerShort), choice, answer: label });

function seed(id: string, over: Partial<CaseDraft>): CaseDraft {
  const payerId = over.payerId as PayerId;
  return blankDraft({ id: `draft-${id.toLowerCase().replace("-", "")}`, caseId: id, saved: true, step: 1, phase: "records", planType: PLAN_TYPE[payerId], cardRead: true, ...over });
}

export const SEED_DRAFTS: CaseDraft[] = [
  /* Scribe waits on one answer (the sertraline start date). Six agents are done, so the chance is settled at 88. */
  seed("R-1042", {
    patient: { initials: "J.M.", age: 34 },
    payerId: "summit",
    memberId: "…4821",
    program: "RES",
    type: "Admission",
    what: "Admission request",
    reason: "Relapse on 9/28 after eleven months of abstinence, with worsening depression.",
    diagnoses: dx("F10.20", "F33.2"),
    documents: docs("summit", "RES", ["therapy_note"], true),
    coverage: { key: "summit|RES|4821|2026-10-20", verdict: "auth_first", at: -2 },
    run: { done: 6, asked: true, question: "sertraline", elapsed: [14, 9, 21, 26, 18, 12] },
    questionKey: "sertraline",
    startChance: 62,
    finalChance: 88,
    dueKind: "notice",
    dueAt: 300,
  }),
  /* Packet waits on one clinician input to finish the recertification. */
  seed("I-2207", {
    patient: { initials: "T.R.", age: 29 },
    payerId: "cardinal",
    memberId: "…7305",
    program: "IOP",
    type: "Recertification",
    what: "Recertification at unit 38 of 48",
    reason: "Steady attendance and lower cravings, but evenings are still the highest-risk hours.",
    diagnoses: dx("F11.20", "F41.1"),
    documents: docs("cardinal", "IOP"),
    coverage: { key: "cardinal|IOP|7305|2026-10-20", verdict: "cleared", at: -4320 },
    run: { done: 8, asked: false, question: "recert", elapsed: [11, 8, 17, 19, 13, 10, 26, 15] },
    questionKey: "recert",
    startChance: 59,
    finalChance: 72,
    dueKind: "expires",
    dueAt: 4320,
  }),
  /* All four checks passed. Waiting for a clinician to sign. */
  seed("R-0988", {
    step: 2,
    patient: { initials: "D.L.", age: 41 },
    payerId: "beacon",
    memberId: "…2096",
    program: "RES",
    type: "Continued stay",
    what: "Continued-stay review 3",
    reason: "Progress is steady, and the chart still supports a structured setting through the next review.",
    diagnoses: dx("F10.20", "F41.1"),
    documents: docs("beacon", "RES"),
    coverage: { key: "beacon|RES|2096|2026-10-20", verdict: "cleared", at: -1440 },
    run: { done: 10, asked: true, question: null, elapsed: [13, 9, 18, 21, 14, 16, 29, 17, 15, 11] },
    answers: [answer("stepdown", "named", "Yes, a named provider is on file", "Beacon")],
    questionKey: "stepdown",
    startChance: 69,
    finalChance: 79,
    dueKind: "review",
    dueAt: 318,
  }),
  /* Packet is assembling the retro-authorization from the detox chart. Coverage lapsed on 10/12, so a warning waits at the end. */
  seed("R-1101", {
    patient: { initials: "K.W.", age: 26 },
    payerId: "summit",
    memberId: "…1012",
    program: "RES",
    levelLabel: "Detox → Residential",
    type: "Retro-authorization",
    reason: "Detox days were delivered while coverage was being sorted out. Residential care followed on the same admission.",
    diagnoses: dx("F11.23", "F11.20"),
    documents: docs("summit", "RES", ["therapy_note"]),
    coverage: { key: "summit|RES|1012|2026-10-20", verdict: "fix", at: -6 },
    run: { done: 8, asked: false, question: null, elapsed: [12, 8, 19, 18, 12, 11, 24, 14] },
    startChance: 38,
    finalChance: 47,
    dueKind: "window",
    dueAt: 1080,
  }),
  /* Reader is reading the chart. */
  seed("I-2262", {
    patient: { initials: "S.N.", age: 31 },
    payerId: "lakeshore",
    memberId: "…2290",
    program: "IOP",
    type: "Initial request",
    reason: "Stimulant use for two years. Two earlier outpatient attempts ended early.",
    diagnoses: dx("F14.20"),
    documents: docs("lakeshore", "IOP", ["attendance"]),
    coverage: { key: "lakeshore|IOP|2290|2026-10-20", verdict: "auth_first", at: -35 },
    run: { done: 0, asked: false, question: null, elapsed: [] },
    questionKey: "recert",
    startChance: 84,
    finalChance: 90,
    dueKind: "packet",
    dueAt: 2 * 1440 + 360,
  }),
];
