/* Intake logic that has no screen of its own: where a draft starts from, the sample chart, the EMR pull, attaching a referral. */
import { planTypeOf, type CaseDraft } from "@/data/cases";
import { isoOf } from "@/data/patients";
import { PAYERS } from "@/data/seed";
import { siteOf } from "@/data/sites";
import { PROGRAM_LABEL, PROGRAMS, type NewCasePrefill, type PayerId, type Program, type RequestType } from "@/data/types";
import { siteOfVerification } from "@/data/verification";
import { useStore } from "@/store";
import type { AppState } from "@/store";
import { selectUnmappedForConnected } from "@/store/emr";
import { referralPrefill } from "@/store/referrals";
import { paths } from "@/routes";
import { defaultTypeFor, isAuthKind } from "./authType";
import { docEntries, makeDocument, sampleFile } from "./documents";
import { ICD_CODES, type EmrChart } from "./lookups";
import { payerContextOf } from "./payerContext";

/* ------------------------------------------------------------------ where a draft starts */
const defaultType = (u: NewCasePrefill["urgency"]): RequestType => (u === "routine" ? "Initial request" : "Admission");

/** What a referral fills in: the patient, the referring organization, the service and level of care, the start date, the insurance and the diagnoses. All of it stays editable. */
export function fromPrefill(p: NewCasePrefill, startAt?: number): Partial<CaseDraft> {
  return {
    kind: "initial",
    started: true,
    patient: { initials: p.patientInitials, age: p.age },
    payerId: p.payerId,
    planType: p.payerId ? planTypeOf(p.payerId) : "",
    memberId: p.memberIdMasked,
    cardRead: !!p.payerId,
    program: p.program,
    type: defaultType(p.urgency),
    diagnoses: p.diagnoses,
    reason: p.reason,
    referralId: p.referralId,
    referrer: { org: p.sourceName, clinician: p.referrerName },
    ...(startAt === undefined ? {} : { startDate: isoOf(startAt) }),
    phase: "intake",
  };
}

/** From the Start authorization button on a coverage result: ?payer=&program=&member=&initials=&age= */
export function fromQuery(q: URLSearchParams): Partial<CaseDraft> {
  const payer = PAYERS.find((p) => p.id === q.get("payer"))?.id as PayerId | undefined;
  const program = PROGRAMS.find((p) => p === q.get("program")) as Program | undefined;
  if (!payer && !program) return {};
  const age = Number(q.get("age")) || null;
  return { started: true, payerId: payer ?? null, planType: payer ? planTypeOf(payer) : "", program: program ?? null, memberId: q.get("member") ?? "", patient: { initials: q.get("initials") ?? "", age }, type: "Admission", phase: "intake" };
}

/** From "Create authorization from verification" on Eligibility & Benefits: ?verification=ID carries the check into the case (patient, payer, service, member ID and the dates it covers).
    The case then uses that same record, so the check made there is the one step 2 shows. The type is still to choose, so the case starts as an initial authorization. */
export function fromVerification(st: AppState, id: string): Partial<CaseDraft> | null {
  const rec = st.verifications[id];
  if (!rec) return null;
  return {
    started: true,
    verificationId: rec.id,
    site: siteOfVerification(rec),
    patient: { initials: rec.initials ?? "", age: rec.age },
    payerId: rec.payerId,
    planType: planTypeOf(rec.payerId),
    memberId: rec.memberMasked,
    program: rec.program,
    startDate: rec.dosFrom,
    endDate: rec.dosTo,
    phase: "intake",
  };
}

export interface InitialDraft {
  init: Partial<CaseDraft>;
  missingReferral?: string;
  /** An existing patient to link once the draft exists (?patient=). */
  patient?: string;
}

/** What a new draft starts from, read from the address: ?referral=, ?verification=, ?patient=, ?type= and the older ?payer=&program= link. */
export function initialDraft(q: URLSearchParams, st: AppState): InitialDraft {
  const kindParam = q.get("type");
  const kind = isAuthKind(kindParam) ? kindParam : "initial";
  const base: Partial<CaseDraft> = { kind, type: defaultTypeFor(kind, null) };
  const patient = q.get("patient") ?? undefined;
  const ref = q.get("referral");
  if (ref) {
    const p = referralPrefill(st, ref);
    const r = st.referrals.find((x) => x.id === ref);
    return p ? { init: { ...base, ...fromPrefill(p, r?.accepted?.admitBy), site: siteOf(ref) } } : { init: base, missingReferral: ref };
  }
  const verified = q.get("verification") ? fromVerification(st, q.get("verification") ?? "") : null;
  return { init: { ...base, ...(verified ?? fromQuery(q)), ...(isAuthKind(kindParam) ? { kind, type: defaultTypeFor(kind, null) } : {}) }, patient };
}

/* ------------------------------------------------------------------ one-click helpers (event handlers only) */
export const dx = (...codes: string[]) => ICD_CODES.filter((c) => codes.includes(c.code));

/** J.M.'s chart: what the sample chart fills in, and what Reader fills in when it reads a file that is not an insurance card. */
export const SAMPLE_CHART = {
  patient: { initials: "J.M.", age: 34 },
  payerId: "summit" as PayerId,
  memberId: "SM7403964821",
  program: "RES" as Program,
  type: "Admission" as RequestType,
  startDate: "2026-10-20",
  reason: "Relapse on 9/28 after eleven months of abstinence, with worsening depression.",
  diagnoses: ["F10.20", "F33.2"],
};

/** Everything for J.M. in one click: patient, insurance, request, diagnoses and 8 of the 9 Summit documents. The therapy note is left out so the caution shows.
    A case that already has a patient (started from a referral or an EMR pull) keeps that patient and request: the sample chart only adds the documents. */
export function applySampleChart(id: string): void {
  const st = useStore.getState();
  const draft = st.caseDrafts.find((d) => d.id === id);
  const keep = !!draft && (!!draft.referralId || !!draft.emrChart || !!draft.patientId || !!draft.patient.initials.trim());
  const payerId = keep && draft?.payerId ? draft.payerId : SAMPLE_CHART.payerId;
  const program = keep && draft?.program ? draft.program : SAMPLE_CHART.program;
  if (keep && draft) {
    st.patchCaseDraft(id, {
      cardRead: true,
      memberId: draft.memberId || SAMPLE_CHART.memberId,
      startDate: draft.startDate || SAMPLE_CHART.startDate,
      type: draft.type ?? defaultTypeFor(draft.kind, SAMPLE_CHART.type),
    });
  } else {
    st.patchCaseDraft(id, {
      started: true,
      patient: { ...SAMPLE_CHART.patient },
      payerId: SAMPLE_CHART.payerId,
      planType: planTypeOf(SAMPLE_CHART.payerId),
      memberId: SAMPLE_CHART.memberId,
      cardRead: true,
      program: SAMPLE_CHART.program,
      type: defaultTypeFor(draft?.kind ?? "initial", SAMPLE_CHART.type),
      startDate: SAMPLE_CHART.startDate,
      reason: SAMPLE_CHART.reason,
      diagnoses: dx(...SAMPLE_CHART.diagnoses),
      emrChart: undefined,
    });
  }
  const docs = docEntries(payerId, program, payerContextOf(st, { payerId, program }).items).filter((r) => r.slot !== "therapy_note");
  st.putCaseDocs(id, docs.map((r) => makeDocument(r.slot, sampleFile(r.slot))));
  const who = keep && draft ? `${draft.patient.initials}, ${draft.patient.age ?? ""}` : "J.M., 34";
  st.toast({ title: "Sample chart loaded", body: `${who}. ${docs.length} of ${docs.length + 1} documents are added and being checked.`, tone: "neutral" });
}

/** The EMR fields that name a Psyflo field on the checklist. While one still needs a mapping in EMR Connect, a pull leaves that field blank. */
const MAPPED_FIELD: Record<string, "payer" | "program"> = { "Level of care": "program", "Referral source": "payer" };
/** The fields of the chart's own system that still wait for a mapping and would have filled something on the checklist. */
export const unmappedFor = (st: AppState, c: EmrChart) => selectUnmappedForConnected(st).filter((u) => u.systemId === c.systemId && u.field in MAPPED_FIELD);

export function pullFromEmr(id: string, c: EmrChart): void {
  const st = useStore.getState();
  const gaps = unmappedFor(st, c);
  const blank = new Set(gaps.map((u) => MAPPED_FIELD[u.field]));
  const payerId = blank.has("payer") ? null : c.payerId;
  const kind = st.caseDrafts.find((d) => d.id === id)?.kind ?? "initial";
  st.patchCaseDraft(id, {
    started: true,
    patient: { initials: c.initials, age: c.age },
    payerId,
    planType: payerId ? planTypeOf(payerId) : "",
    memberId: c.memberId,
    program: blank.has("program") ? null : c.program,
    type: defaultTypeFor(kind, c.type),
    diagnoses: dx(...c.diagnoses),
    reason: c.reason,
    emrChart: c.id,
  });
  const left = gaps.map((u) => `“${u.field}”`);
  st.toast({
    title: `Pulled ${c.initials}, ${c.age} from EMR Connect`,
    body: left.length ? `${left.join(" and ")} ${left.length === 1 ? "needs" : "need"} a mapping, so ${left.length === 1 ? "that field was" : "those fields were"} left blank. You can still fill ${left.length === 1 ? "it" : "them"} in.` : "Everything below was filled in from the chart. You can still change it.",
    tone: left.length ? "mid" : "good",
  });
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
  /* The case is at the referral's site, unless it already has its ID: the ID places a case, so it stays where it is. */
  const site = draft.caseId ? draft.site : siteOf(referralId);
  st.patchCaseDraft(draftId, { ...fromPrefill(prefill, r.accepted?.admitBy ?? st.clock), site, documents: [makeDocument("referral", file, false, "done"), ...rest] });
  st.toast({ title: `Referral ${referralId} is in this case`, body: `${prefill.patientInitials}, ${prefill.age}. Check the details below, then go on to Eligibility & Benefits.`, tone: "good" });
  return true;
}

/** Where a referral's button leads: back into the case it was opened from (its Intake, now filled in), or into a new one. */
export function continueWithReferral(referralId: string, draftId: string | null | undefined): string | null {
  const st = useStore.getState();
  const into = draftId && st.caseDrafts.some((d) => d.id === draftId) ? draftId : st.createCaseDraft({});
  return attachReferral(into, referralId) ? paths.newCase({ draft: into }) : null;
}
