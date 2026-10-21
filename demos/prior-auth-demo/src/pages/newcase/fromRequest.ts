/* A New case draft for a request that already exists on the case page (the queue, the Dashboard), built from what that page knows:
   the patient, the payer, the level of care, the documents the payer asks for and, when the request is ready, a finished run.
   Pure, so the case page's Draft tab can show the same summary before the draft is first opened. */
import type { CaseDetail, Evidence } from "@/data/caseDetail";
import { withFocus } from "@/data/caseDetailFocus";
import { canSend, projectedChance, type CaseWork } from "@/data/caseModel";
import { chanceBounds, DUE_FOR, freshRun, planTypeOf, QUESTIONS, RUN_STEPS, type Answer, type CaseDraft, type Diagnosis } from "@/data/cases";
import { verdictOf } from "@/data/eligibility";
import { PAYERS } from "@/data/seed";
import { PROGRAM_LABEL } from "@/data/types";
import { docEntries, makeDocument, sampleFile } from "./documents";
import { coverageFor, coverageKey } from "./intakeRules";
import { ICD_CODES } from "./lookups";
import type { PayerContext } from "./payerContext";
import { planQuestions } from "./questions";
import { blankDraft } from "./seedDrafts";

export type RequestState = "ready" | "preparing" | "sent";

/** "sent": the payer has it or it was decided. "ready": nothing is open, so a clinician can sign. "preparing": agents still have work to do. */
export function requestState(detail: CaseDetail, work: CaseWork): RequestState {
  if (detail.phase === "payer" || detail.phase === "denial" || detail.chip) return "sent";
  return detail.phase === "ready" || canSend(withFocus(detail, work), work) ? "ready" : "preparing";
}

/** The flow names its drafts "draft-r1042" (the notification links use it); a draft that was signed carries the request's ID as its case ID. */
export const conventionalDraftId = (requestId: string): string => `draft-${requestId.toLowerCase().replace("-", "")}`;
export const draftForRequest = (drafts: CaseDraft[], requestId: string, caseId?: string): CaseDraft | undefined =>
  drafts.find((d) => d.id === conventionalDraftId(requestId) || d.caseId === requestId || (!!caseId && d.caseId === caseId));

/* What each action on the case page adds to the summary, in the New case summary's section names. */
const SECTION_OF: Record<string, string> = { clinical: "clinical", lower: "level", current: "severity", plan: "plan" };

export interface RecAdd {
  recId: string;
  section: string;
  text: string;
  source?: Evidence;
}
/** The sentences the case page's applied actions add to the summary. The cards a "Refine recommendations" focus added count too, so the case is read as the page shows it. */
export const appliedAdds = (detail: CaseDetail, work: CaseWork): RecAdd[] =>
  withFocus(detail, work).recs.flatMap((r) => (r.add && work.applied.includes(r.id) ? [{ recId: r.id, section: SECTION_OF[r.add.section] ?? r.add.section, text: r.add.text(work.inputs[r.id] ?? ""), source: r.add.source }] : []));

const DX_FOR: [RegExp, string][] = [[/alcohol/i, "F10.20"], [/opioid/i, "F11.20"], [/stimulant/i, "F15.20"], [/cannabis/i, "F12.20"], [/depress/i, "F33.1"], [/anxiety/i, "F41.1"]];
const diagnosesOf = (text: string): Diagnosis[] => ICD_CODES.filter((c) => DX_FOR.some(([re, code]) => re.test(text) && code === c.code));

/** The ID of a member the demo has not seen: four digits from the request ID, never one that scripts a coverage result. */
const memberFor = (requestId: string): string => {
  const n = 1000 + ((Number(requestId.replace(/\D/g, "")) * 7919) % 9000);
  return `…${[1012, 9999, 3030, 6060, 9090].includes(n) ? n + 1 : n}`;
};
const ELAPSED = [12, 8, 17, 18, 12, 11, 22, 13, 11, 9];

/** The draft the request would have: finished agents when it is ready, the agent that is working when it is not. `id` is left empty for the store to give. */
export function requestDraft(base: CaseDetail, work: CaseWork, clock: number, ctx: PayerContext): CaseDraft {
  const detail = withFocus(base, work);
  const state = requestState(detail, work);
  const { payerId, program } = detail;
  const short = PAYERS.find((p) => p.id === payerId)?.shortName ?? "the payer";
  const conflict = detail.recs.some((r) => r.id === "sertraline");
  const noTherapy = detail.recs.some((r) => r.id === "therapy") && !work.applied.includes("therapy");
  const documents = docEntries(payerId, program, ctx.items)
    .filter((e) => !(noTherapy && e.slot === "therapy_note"))
    .map((e) => makeDocument(e.slot, sampleFile(e.slot), conflict && e.slot === "meds", "done", !(conflict && e.slot === "meds")));

  const answers: Answer[] = [];
  const answered = (key: "sertraline" | "stepdown", choice: string, answer: string, note?: string) =>
    answers.push({ key, agent: QUESTIONS[key].agent, question: QUESTIONS[key].text(short), choice, answer, note, fromCase: true });
  if (work.applied.includes("sertraline")) answered("sertraline", "", work.inputs.sertraline?.trim() || "9/14");
  if (work.applied.includes("stepdown")) answered("stepdown", "named", "Yes, a named provider is on file", work.inputs.stepdown?.trim() || undefined);

  const final = Math.max(1, Math.min(97, projectedChance(detail, work)));
  const draft = blankDraft({
    caseId: detail.requestId,
    sent: state === "sent",
    step: state === "ready" ? 2 : 1,
    phase: "records",
    patient: { initials: detail.initials, age: detail.age },
    payerId,
    planType: planTypeOf(payerId),
    memberId: memberFor(detail.requestId),
    cardRead: true,
    program,
    levelLabel: detail.levelLabel === PROGRAM_LABEL[program] ? undefined : detail.levelLabel,
    type: detail.type,
    reason: `${detail.summary.diagnosis} ${detail.summary.trajectory}`.trim(),
    diagnoses: diagnosesOf(`${detail.dx} ${detail.summary.diagnosis}`),
    documents,
    answers,
    startChance: Math.max(1, Math.min(detail.baseChance, final - 6)),
    finalChance: final,
  });

  const done = state === "ready" || state === "sent" ? RUN_STEPS.length : Math.max(0, RUN_STEPS.findIndex((s) => s.agent === detail.agent));
  const due = DUE_FOR[detail.type];
  const key = coverageKey(draft);
  const found = coverageFor(draft, clock);
  return {
    ...draft,
    /* The portals were reached when the request was opened, so Verify never fails here. */
    run: { ...freshRun(), done, asked: done >= RUN_STEPS.length, elapsed: ELAPSED.slice(0, done), retried: true },
    questions: planQuestions(draft).filter((k) => RUN_STEPS.findIndex((s) => s.agent === QUESTIONS[k].agent) >= done),
    coverage: key && found ? { key, verdict: verdictOf(found), at: clock - 60 } : null,
    dueKind: due?.kind ?? null,
    dueAt: detail.dueAt ?? (due ? clock + due.in : null),
  };
}

/** A draft that already exists keeps what the person did there. It takes from the request what the case page changed since: the answers the applied actions gave,
    the therapy note, and a finished run once every check passes. It moves to the step that fits: Review and sign when ready, Agents work when agents have work left. */
export function mergeRequestDraft(d: CaseDraft, target: CaseDraft, state: RequestState): CaseDraft {
  if (d.sent) return d;
  const answers = [...d.answers, ...target.answers.filter((a) => !d.answers.some((x) => x.key === a.key))];
  const therapy = target.documents.find((x) => x.slot === "therapy_note");
  const documents = therapy && !d.documents.some((x) => x.slot === "therapy_note") && !("therapy_note" in d.unavailable) ? [...d.documents, therapy] : d.documents;
  const open = d.run.question && !answers.some((a) => a.key === d.run.question) ? d.run.question : null;
  if (state === "ready") return { ...d, answers, documents, run: { ...target.run, skipped: d.run.skipped }, step: 2 };
  /* A run that already finished stays where the person left it: Review and sign. Otherwise the agents still have work to do. */
  const finished = d.run.done >= RUN_STEPS.length;
  return { ...d, answers, documents, run: { ...d.run, question: open }, step: finished ? d.step : d.run.done > 0 || d.step >= 1 ? 1 : d.step };
}
