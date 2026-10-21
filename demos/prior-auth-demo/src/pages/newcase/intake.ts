/* Intake logic that has no screen of its own: what is missing, where a draft starts from, the sample chart, the EMR pull. */
import { maskMember, PLAN_TYPE, type CaseDraft } from "@/data/cases";
import { simulateCheck, type EbPatient } from "@/data/eligibility";
import { PAYERS } from "@/data/seed";
import { PROGRAM_LABEL, PROGRAMS, type NewCasePrefill, type PayerId, type Program, type RequestType } from "@/data/types";
import { useStore } from "@/store";
import type { AppState } from "@/store";
import { referralPrefill } from "@/store/referrals";
import { paths } from "@/routes";
import { makeDocument, requiredDocs, sampleFile } from "./documents";
import { ICD_CODES, type EmrChart } from "./lookups";

export const memberReady = (id: string): boolean => id.replace(/\W/g, "").length >= 4;

/** The Verify result for what is typed on the intake, or null until payer, level of care and member ID are set. */
export function coverageFor(d: CaseDraft, clock: number): EbPatient | null {
  if (!d.payerId || !d.program || !memberReady(d.memberId)) return null;
  const [y, m, day] = d.startDate.split("-");
  const dos = y ? `${m}/${day}/${y}` : "10/21/2026";
  return {
    id: "intake",
    initials: d.patient.initials || null,
    age: d.patient.age,
    payerId: d.payerId,
    program: d.program,
    memberMasked: maskMember(d.memberId),
    ...simulateCheck({ payerId: d.payerId, program: d.program, memberId: d.memberId, dos }),
    dos,
    checkedAt: clock,
    recheckDue: false,
  };
}
export const coverageKey = (d: CaseDraft): string | null => (d.payerId && d.program && memberReady(d.memberId) ? `${d.payerId}|${d.program}|${d.memberId.replace(/\W/g, "").slice(-4)}|${d.startDate}` : null);

/** What still stops Continue, in words. Empty means the intake is complete. */
export function intakeMissing(d: CaseDraft): string[] {
  const out: string[] = [];
  if (!d.patient.initials.trim() || !d.patient.age) out.push("the patient's initials and age");
  if (!d.payerId) out.push("the payer");
  if (!d.program) out.push("the level of care");
  if (!d.type) out.push("the request type");
  const slots = new Set(d.documents.map((x) => x.slot));
  const lacking = requiredDocs(d.payerId, d.program).filter((r) => r.required && !slots.has(r.slot)).length;
  if (lacking) out.push(`${lacking} required ${lacking === 1 ? "document" : "documents"}`);
  if (d.documents.some((x) => x.status === "validating")) out.push("the document checks to finish");
  if (d.coverage?.verdict === "fix" && d.type !== "Retro-authorization") out.push("coverage fixed, or another payer");
  return out;
}

/* ------------------------------------------------------------------ where a draft starts */
const defaultType = (u: NewCasePrefill["urgency"]): RequestType => (u === "routine" ? "Initial request" : "Admission");

export function fromPrefill(p: NewCasePrefill): Partial<CaseDraft> {
  return {
    patient: { initials: p.patientInitials, age: p.age },
    payerId: p.payerId,
    planType: p.payerId ? PLAN_TYPE[p.payerId] : "",
    memberId: p.memberIdMasked,
    program: p.program,
    type: defaultType(p.urgency),
    diagnoses: p.diagnoses,
    reason: p.reason,
    referralId: p.referralId,
    phase: "records",
  };
}

/** From the Start authorization button on a coverage result: ?payer=&program=&member=&initials=&age= */
export function fromQuery(q: URLSearchParams): Partial<CaseDraft> {
  const payer = PAYERS.find((p) => p.id === q.get("payer"))?.id as PayerId | undefined;
  const program = PROGRAMS.find((p) => p === q.get("program")) as Program | undefined;
  if (!payer && !program) return {};
  const age = Number(q.get("age")) || null;
  return { payerId: payer ?? null, planType: payer ? PLAN_TYPE[payer] : "", program: program ?? null, memberId: q.get("member") ?? "", patient: { initials: q.get("initials") ?? "", age }, type: "Admission", phase: "records" };
}

export function initialDraft(q: URLSearchParams, st: AppState): { init: Partial<CaseDraft>; missingReferral?: string } {
  const ref = q.get("referral");
  if (ref) {
    const p = referralPrefill(st, ref);
    return p ? { init: fromPrefill(p) } : { init: {}, missingReferral: ref };
  }
  return { init: fromQuery(q) };
}

/* ------------------------------------------------------------------ one-click helpers (event handlers only) */
const dx = (...codes: string[]) => ICD_CODES.filter((c) => codes.includes(c.code));

/** Everything for J.M. in one click: patient, insurance, request, diagnoses and 8 of the 9 Summit documents. The therapy note is left out so the caution shows.
    A case that already has a patient (started from a referral or an EMR pull) keeps that patient and request: the sample chart only adds the documents. */
export function applySampleChart(id: string): void {
  const st = useStore.getState();
  const draft = st.caseDrafts.find((d) => d.id === id);
  const keep = !!draft && (!!draft.referralId || !!draft.emrChart || !!draft.patient.initials.trim());
  const payerId = keep && draft?.payerId ? draft.payerId : "summit";
  const program = keep && draft?.program ? draft.program : "RES";
  if (keep && draft) {
    st.patchCaseDraft(id, {
      cardRead: true,
      phase: "records",
      memberId: draft.memberId || "SM7403964821",
      startDate: draft.startDate || "2026-10-20",
      type: draft.type ?? "Admission",
    });
  } else {
    st.patchCaseDraft(id, {
      patient: { initials: "J.M.", age: 34 },
      payerId: "summit",
      planType: PLAN_TYPE.summit,
      memberId: "SM7403964821",
      cardRead: true,
      phase: "records",
      program: "RES",
      type: "Admission",
      startDate: "2026-10-20",
      reason: "Relapse on 9/28 after eleven months of abstinence, with worsening depression.",
      diagnoses: dx("F10.20", "F33.2"),
      emrChart: undefined,
    });
  }
  const docs = requiredDocs(payerId, program).filter((r) => r.slot !== "therapy_note");
  st.putCaseDocs(id, docs.map((r) => makeDocument(r.slot, sampleFile(r.slot))));
  const who = keep && draft ? `${draft.patient.initials}, ${draft.patient.age ?? ""}` : "J.M., 34";
  st.toast({ title: "Sample chart loaded", body: `${who}. ${docs.length} of ${docs.length + 1} documents are added and being checked.`, tone: "neutral" });
}

export function pullFromEmr(id: string, c: EmrChart): void {
  const st = useStore.getState();
  st.patchCaseDraft(id, { patient: { initials: c.initials, age: c.age }, payerId: c.payerId, planType: PLAN_TYPE[c.payerId], memberId: c.memberId, program: c.program, type: c.type, diagnoses: dx(...c.diagnoses), reason: c.reason, emrChart: c.id, phase: "records" });
  st.toast({ title: `Pulled ${c.initials}, ${c.age} from EMR Connect`, body: "Everything below was filled in from the chart. You can still change it.", tone: "good" });
}

export const emrLabel = (c: EmrChart): string => `${c.initials}, ${c.age} · ${PAYERS.find((p) => p.id === c.payerId)?.shortName} · ${PROGRAM_LABEL[c.program]}`;

/* ------------------------------------------------------------------ the referral comes first */
/** Puts a referral into a case: the patient, payer, level of care and diagnoses come from it, and the referral itself counts as the first document.
    Returns false when the referral or the case is missing. */
export function attachReferral(draftId: string, referralId: string): boolean {
  const st = useStore.getState();
  const prefill = referralPrefill(st, referralId);
  const draft = st.caseDrafts.find((d) => d.id === draftId);
  const r = st.referrals.find((x) => x.id === referralId);
  if (!prefill || !draft || !r) return false;
  const file = { id: `ref-${referralId}`, name: `${referralId} referral.pdf`, sizeKb: 190 + r.plan.pages * 12 };
  const rest = draft.documents.filter((d) => d.slot !== "referral");
  st.patchCaseDraft(draftId, { ...fromPrefill(prefill), documents: [makeDocument("referral", file, false, "done"), ...rest] });
  st.toast({ title: `Referral ${referralId} is in this case`, body: `${prefill.patientInitials}, ${prefill.age}. Next, add the medical records.`, tone: "good" });
  return true;
}

/** Where a referral's button leads: back into the case it was opened from, or into a new one. */
export function continueWithReferral(referralId: string, draftId: string | null | undefined): string | null {
  const st = useStore.getState();
  const into = draftId && st.caseDrafts.some((d) => d.id === draftId) ? draftId : st.createCaseDraft({});
  return attachReferral(into, referralId) ? paths.newCase({ draft: into }) : null;
}
