/* What the Medical records step needs before the agents can start, as plain functions with no store in them.
   The checklist rows, the footer hint and Review and sign all read these, so they always agree. */
import { maskMember, type CaseDraft, type DocSlotId } from "@/data/cases";
import { simulateCheck, type EbPatient } from "@/data/eligibility";
import type { DocItem } from "@/data/payerConfig";
import { docEntries, slotLabel } from "./documents";

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

export const patientReady = (d: CaseDraft): boolean => !!d.patient.initials.trim() && !!d.patient.age;

/** Required documents that are not in yet. A document marked not available is handled, so it is not missing. */
export function missingRequired(d: CaseDraft, items: DocItem[] | null): DocSlotId[] {
  const have = new Set(d.documents.map((x) => x.slot));
  return docEntries(d.payerId, d.program, items).filter((r) => r.required && !have.has(r.slot) && !(r.slot in d.unavailable)).map((r) => r.slot);
}
const stillReading = (d: CaseDraft): boolean => d.documents.some((x) => x.status === "validating");
/** A coverage problem stops Continue, except on a retro-authorization, which exists to cover a gap. */
const coverageBlocks = (d: CaseDraft): boolean => d.coverage?.verdict === "fix" && d.type !== "Retro-authorization";

/** What still stops Continue, in the checklist's own words. Empty means the intake is complete. `items` is the payer's saved document list. */
export function intakeMissing(d: CaseDraft, items: DocItem[] | null): string[] {
  const out: string[] = [];
  if (!patientReady(d)) out.push("Patient initials and age");
  if (!d.payerId) out.push("Payer and plan");
  if (!d.program) out.push("Level of care");
  if (!d.type) out.push("Request type");
  const lacking = missingRequired(d, items);
  if (lacking.length > 2) out.push(`${lacking.length} required documents`);
  else out.push(...lacking.map(slotLabel));
  if (stillReading(d)) out.push("Reader to finish reading");
  if (coverageBlocks(d)) out.push("Coverage, or another payer");
  return out;
}
