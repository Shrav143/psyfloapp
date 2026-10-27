/* The five Dashboard "Preparing" requests as drafts, each at the step it is on, plus the blank draft a new case starts from. */
import { freshRun, planTypeOf, QUESTIONS, type Answer, type CaseDraft, type DocSlotId, type QuestionKey, type RunState } from "@/data/cases";
import { seedPayerConfig } from "@/data/payerConfigSeed";
import { siteOf } from "@/data/sites";
import { docsOf } from "@/data/programTables";
import type { PayerId, Program } from "@/data/types";
import { kindOfType } from "./authType";
import { docEntries, makeDocument, sampleFile } from "./documents";
import { QUEUE_ITEMS } from "@/data/queue";
import { ICD_CODES } from "./lookups";
import { severityLine } from "./narrative";

export function blankDraft(over: Partial<CaseDraft> = {}): CaseDraft {
  return {
    id: "",
    caseId: null,
    saved: false,
    sent: false,
    step: 0,
    phase: "intake",
    kind: "initial",
    site: "A",
    patientId: null,
    episodeId: null,
    authorizationId: null,
    verificationId: null,
    started: false,
    patient: { initials: "", age: null },
    reference: "",
    payerId: null,
    planType: "",
    state: "Virginia",
    memberId: "",
    cardRead: false,
    program: null,
    type: null,
    startDate: "2026-10-20",
    reason: "",
    diagnoses: [],
    documents: [],
    unavailable: {},
    run: freshRun(),
    answers: [],
    questions: [],
    suggestions: [],
    narrative: null,
    revision: 0,
    unmet: 0,
    startChance: 62,
    finalChance: 88,
    dueKind: null,
    dueAt: null,
    updatedAt: 0,
    ...over,
  };
}

const dx = (...codes: string[]) => ICD_CODES.filter((c) => codes.includes(c.code));
const PAYER_CONFIG = seedPayerConfig();
/** The sample documents for what the payer asks for at this level of care, minus the ones the chart does not have. */
function docs(payer: PayerId, program: Program, skip: DocSlotId[] = [], sertralineConflict = false) {
  return docEntries(payer, program, PAYER_CONFIG[payer] ? docsOf(PAYER_CONFIG[payer].docs, payer, program) : null)
    .filter((r) => !skip.includes(r.slot))
    .map((r) => makeDocument(r.slot, sampleFile(r.slot), sertralineConflict, "done"));
}
/** A run that has not failed, retried or skipped anything. */
const run = (r: Pick<RunState, "done" | "asked" | "question" | "elapsed">): RunState => ({ ...freshRun(), ...r });
const answer = (key: QuestionKey, choice: string, label: string, payerShort: string): Answer => ({ key, agent: QUESTIONS[key].agent, question: QUESTIONS[key].text(payerShort), choice, answer: label });

/** A seeded draft is a case the ledger already knows: its patient, episode and authorization are the ledger's own (data/patients.ts). */
function seed(id: string, over: Partial<CaseDraft>): CaseDraft {
  const payerId = over.payerId as PayerId;
  /* The severity line follows the case's own scores, as the case page says it. R-1042's chart is the sample documents' own, so it keeps their line. */
  const scores = id === "R-1042" ? [] : QUEUE_ITEMS.find((i) => i.id === id)?.scores ?? [];
  return blankDraft({
    severity: severityLine(scores),
    id: `draft-${id.toLowerCase().replace("-", "")}`, caseId: id, saved: true, step: 1, phase: "records", planType: planTypeOf(payerId), cardRead: true,
    site: siteOf(id), kind: kindOfType(over.type ?? null), started: true, patientId: id, episodeId: `EP-${id}`, authorizationId: `AU-${id}`, ...over,
  });
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
    run: run({ done: 6, asked: true, question: "sertraline", elapsed: [14, 9, 21, 26, 18, 12] }),
    questions: ["sertraline", "stepdown"],
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
    run: run({ done: 8, asked: false, question: "recert", elapsed: [11, 8, 17, 19, 13, 10, 26, 15] }),
    questions: ["recert"],
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
    run: run({ done: 10, asked: true, question: null, elapsed: [13, 9, 18, 21, 14, 16, 29, 17, 15, 11] }),
    answers: [answer("stepdown", "named", "Yes, a named provider is on file", "Medicaid FFS")],
    questions: ["stepdown"],
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
    run: run({ done: 8, asked: false, question: null, elapsed: [12, 8, 19, 18, 12, 11, 24, 14] }),
    questions: [],
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
    run: freshRun(),
    questions: ["recert"],
    startChance: 84,
    finalChance: 90,
    dueKind: "packet",
    dueAt: 2 * 1440 + 360,
  }),
];
