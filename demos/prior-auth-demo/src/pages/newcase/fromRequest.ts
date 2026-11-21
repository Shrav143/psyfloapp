/* A New Authorization draft for a request that already exists on the case page (the queue, the Dashboard), built from what that page knows:
   the patient, the payer, the level of care, the documents the payer asks for and, when the request is ready, a finished run.
   Pure, so the case page's Draft tab can show the same summary before the draft is first opened. */
import type { CaseDetail, Evidence } from "@/data/caseDetail";
import { withFocus } from "@/data/caseDetailFocus";
import { canSend, projectedChance, type CaseWork } from "@/data/caseModel";
import { DUE_FOR, freshRun, planTypeOf, QUESTIONS, RUN_STEPS, type Answer, type CaseDraft, type Diagnosis } from "@/data/cases";
import { memberMaskedOf } from "@/data/patients";
import { PAYERS } from "@/data/seed";
import { siteOf } from "@/data/sites";
import { PROGRAM_LABEL } from "@/data/types";
import { kindOfType } from "./authType";
import { docEntries, makeDocument, sampleFile } from "./documents";
import { ICD_CODES } from "./lookups";
import type { PayerContext } from "./payerContext";
import { planQuestions } from "./questions";
import { datesOfService } from "./verificationFor";
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

/* What each action on the case page adds to the summary, in the New Authorization summary's section names. */
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

/** The ICD-10 codes a case's diagnosis names. A bipolar depressed episode is not a major depressive disorder, and "recurrent, severe" is F33.2, not the moderate F33.1. */
export function diagnosisCodesOf(text: string): string[] {
  const codes: string[] = [];
  if (/alcohol/i.test(text)) codes.push("F10.20");
  if (/opioid/i.test(text)) codes.push("F11.20");
  if (/stimulant/i.test(text)) codes.push("F15.20");
  if (/cannabis/i.test(text)) codes.push("F12.20");
  if (/bipolar/i.test(text)) codes.push(/depress/i.test(text) ? "F31.30" : "F31.9");
  else if (/depress/i.test(text)) codes.push(/recurrent,? severe/i.test(text) ? "F33.2" : "F33.1");
  if (/post-?traumatic|\bptsd\b/i.test(text)) codes.push("F43.10");
  if (/anxiety/i.test(text)) codes.push("F41.1");
  return codes;
}
const diagnosesOf = (text: string): Diagnosis[] => diagnosisCodesOf(text).flatMap((code) => ICD_CODES.filter((c) => c.code === code));

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
    kind: kindOfType(detail.type),
    site: siteOf(detail.id),
    started: true,
    patientId: detail.id,
    episodeId: `EP-${detail.requestId}`,
    authorizationId: `AU-${detail.requestId}`,
    patient: { initials: detail.initials, age: detail.age },
    payerId,
    planType: planTypeOf(payerId),
    memberId: memberMaskedOf(detail.id),
    cardRead: true,
    program,
    levelLabel: detail.levelLabel === PROGRAM_LABEL[program] ? undefined : detail.levelLabel,
    type: detail.type,
    reason: `${detail.summary.diagnosis} ${detail.summary.trajectory}`.trim(),
    diagnoses: diagnosesOf(`${detail.dx} ${detail.summary.diagnosis}`),
    /* The case page's own severity line, from the case's scores; R-1042's is its authored one. */
    severity: detail.draft.find((s) => s.id === "current")?.text,
    documents,
    answers,
    startChance: Math.max(1, Math.min(detail.baseChance, final - 6)),
    finalChance: final,
  });

  const done = state === "ready" || state === "sent" ? RUN_STEPS.length : Math.max(0, RUN_STEPS.findIndex((s) => s.agent === detail.agent));
  const due = DUE_FOR[detail.type];
  /* A retroactive request is asked for its dates of service: a draft made from one that exists has the level of care's usual length, so it is not stopped for a missing last date. */
  const dos = draft.kind === "retro" ? datesOfService(draft) : null;
  return {
    ...draft,
    ...(dos ? { endDate: dos.to } : {}),
    /* The portals were reached when the request was opened, so Verify never fails here. */
    run: { ...freshRun(), done, asked: done >= RUN_STEPS.length, elapsed: ELAPSED.slice(0, done), retried: true },
    questions: planQuestions(draft).filter((k) => RUN_STEPS.findIndex((s) => s.agent === QUESTIONS[k].agent) >= done),
    dueKind: due?.kind ?? null,
    dueAt: detail.dueAt ?? (due ? clock + due.in : null),
  };
}

/** A draft that already exists keeps what the person did there. It takes from the request what the case page changed since: the answers the applied actions gave,
    the therapy note, and a finished run once every check passes. It moves to the step that fits: Review & submit when ready, the agents' section of Clinical documentation when they have work left. */
export function mergeRequestDraft(d: CaseDraft, target: CaseDraft, state: RequestState): CaseDraft {
  if (d.sent) return d;
  if (!d.severity && target.severity) d = { ...d, severity: target.severity };
  const answers = [...d.answers, ...target.answers.filter((a) => !d.answers.some((x) => x.key === a.key))];
  const therapy = target.documents.find((x) => x.slot === "therapy_note");
  const documents = therapy && !d.documents.some((x) => x.slot === "therapy_note") && !("therapy_note" in d.unavailable) ? [...d.documents, therapy] : d.documents;
  const open = d.run.question && !answers.some((a) => a.key === d.run.question) ? d.run.question : null;
  if (state === "ready") return { ...d, answers, documents, run: { ...target.run, skipped: d.run.skipped }, step: 2 };
  /* A run that already finished stays where the person left it: Review & submit. Otherwise the agents still have work to do. */
  const finished = d.run.done >= RUN_STEPS.length;
  return { ...d, answers, documents, run: { ...d.run, question: open }, step: finished ? d.step : d.run.done > 0 || d.step >= 1 ? 1 : d.step };
}
