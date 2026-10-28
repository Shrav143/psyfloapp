/* What a New Authorization reads from the shared intake record, as plain data: the person, the service (the clinician's selection, with what the referral asked for beside it),
   the request type the intake purpose leads to, the treatment episode, the diagnoses the record mentions and the documents it already holds. Nothing here asks anyone to retype. */
import { requestedServiceOf, selectedServiceOf } from "@/data/assess/carePlan";
import { programById } from "@/data/assess/programs";
import { purposeById } from "@/data/assess/purposes";
import { recordDocs } from "@/data/assess/recordDocs";
import { planTypeOf, type AuthKind, type CaseDraft, type Diagnosis, type DraftDocument, type ServiceNote } from "@/data/cases";
import { authorizationsOf, episodesOf, isoOf, patientById, type PatientBook } from "@/data/patients";
import type { IntakeRecord } from "@/data/intake/types";
import { REDESIGN_START } from "@/data/va/policy";
import { serviceById, type VaServiceId } from "@/data/va/services";
import { makeDocument } from "./documents";
import { ICD_CODES } from "./lookups";

/** The request kind the intake's purpose leads to, or null when the purpose leads to no authorization (a screening, a discharge). A record with no configuration is an initial request. */
export function kindOfIntake(r: IntakeRecord): AuthKind | null {
  return r.config ? purposeById(r.config.purposeId).requestKind : "initial";
}

/** The service the authorization is for: the clinician's selection, else what the referral asked for. An external program is not a Virginia service, so it has none. */
export function serviceOfIntake(r: IntakeRecord): { serviceId: VaServiceId; selected: boolean } {
  const sel = selectedServiceOf(r);
  return sel && sel !== "external" ? { serviceId: sel, selected: true } : { serviceId: r.serviceId, selected: false };
}

export function serviceNoteOf(r: IntakeRecord): ServiceNote {
  const sel = selectedServiceOf(r);
  const cp = r.carePlan;
  const last = cp?.selections?.[cp.selections.length - 1];
  return {
    requested: requestedServiceOf(r), selected: sel && sel !== "external" ? sel : null, by: cp?.selectedBy, at: cp?.selectedAt, reason: cp?.rationale || undefined,
    rolePlay: last?.rolePlay, carePlanVersion: cp?.version,
  };
}

/** The ICD-10 codes the record mentions (a documented diagnosis, the assessment, the signed modules), as the case's diagnoses. Psyflo codes nothing: it only reads what a person wrote. */
export function diagnosesOfIntake(r: IntakeRecord): Diagnosis[] {
  const texts = [
    r.referral.dxDocumented?.value, r.referral.concerns?.value, r.referral.reason?.value,
    ...Object.values(r.assessment.fields).map((f) => f.value),
    ...Object.values(r.instruments ?? {}).flatMap((i) => Object.values(i.fields).map((f) => f.value)),
  ].filter((t): t is string => !!t);
  const codes = [...new Set(texts.flatMap((t) => t.match(/\b[A-Z]\d{2}(?:\.\d{1,4})?\b/g) ?? []))];
  return codes.slice(0, 4).map((code) => ICD_CODES.find((c) => c.code === code) ?? { code, label: "As documented in the record" });
}

const hashOf = (s: string): number => Array.from(s).reduce((a, c) => a + c.charCodeAt(0), 0);

const memberOf = (r: IntakeRecord): string => {
  const tail = (r.coverage.medicaidId?.value ?? "").replace(/[^0-9A-Za-z]/g, "").slice(-4);
  return tail ? `…${tail}` : "";
};

/** The planned start for the request: the intake's planned start, or the day a redesigned service starts when that is later. */
export function startDateOf(r: IntakeRecord, serviceId: VaServiceId): string {
  const redesign = serviceById(serviceId).status === "redesign";
  return isoOf(redesign ? Math.max(r.serviceDate, REDESIGN_START) : r.serviceDate);
}

/** The fields of a draft that come from the intake. Written once the person picks the intake, and again when the care plan changes. */
export function draftFieldsFromIntake(r: IntakeRecord, kind: AuthKind): Partial<CaseDraft> {
  const { serviceId } = serviceOfIntake(r);
  const dob = r.profile.dob?.value;
  const org = r.referral.sourceOrg?.value || r.sourceOrg;
  const clinician = r.referral.referringClinician?.value ?? "";
  return {
    intakeId: r.id, kind, started: true,
    patient: { initials: r.initials, age: r.age, ...(dob && /^\d{4}-\d{2}-\d{2}$/.test(dob) ? { dob } : {}) },
    payerId: r.payerId, planType: r.payerId ? planTypeOf(r.payerId) : "", memberId: memberOf(r), cardRead: !!r.payerId,
    program: serviceById(serviceId).program, levelLabel: undefined, state: "Virginia",
    referrer: { org, clinician }, reason: r.referral.reason?.value || r.title, diagnoses: diagnosesOfIntake(r),
    serviceNote: serviceNoteOf(r), startDate: startDateOf(r, serviceId),
  };
}

/** The treatment episode and authorization an existing-episode request belongs to, from the record's own link or the patient's only episode. Null when none is on file. */
export function episodeLink(r: IntakeRecord, book: PatientBook): { patientId: string; episodeId?: string; authorizationId?: string } | null {
  const ep = r.episodeId ? book.episodes.find((e) => e.id === r.episodeId) : undefined;
  if (ep) return { patientId: ep.patientId, episodeId: ep.id, authorizationId: authorizationsOf(book, ep.id)[0]?.id };
  const p = r.patientId ? patientById(book, r.patientId) : undefined;
  if (!p) return null;
  const eps = episodesOf(book, p.id);
  return eps.length === 1 ? { patientId: p.id, episodeId: eps[0].id, authorizationId: authorizationsOf(book, eps[0].id)[0]?.id } : { patientId: p.id };
}

/** What the record offers for the payer's document slots, as documents of the draft. A document someone dropped into the draft is never replaced. */
export function documentsFromIntake(r: IntakeRecord, d: CaseDraft): DraftDocument[] {
  const mine = new Set(d.documents.filter((x) => !x.from).map((x) => x.slot));
  return recordDocs(r)
    .filter((x) => !mine.has(x.slot))
    .map((x) => ({
      ...makeDocument(x.slot, { id: `rec-${r.id}-${hashOf(x.slot)}`, name: `${x.label} (${r.id}).pdf`, sizeKb: 90 + (hashOf(x.slot) % 240) }, false, "done", true),
      from: x.from,
    }));
}

/** The program the intake is evaluated for, in words (used in notes). */
export const intakeProgramLabel = (r: IntakeRecord): string => (r.config ? programById(r.config.programId).label : serviceById(r.serviceId).label);
