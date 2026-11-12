/* New Authorization reads and writes the shared verification record (data/verification.ts, store/eligibility.ts): the same record the Eligibility & Benefits page shows.
   This file decides which record a case uses and what it means for the case. It adds no verification logic of its own. */
import type { CaseDraft, DocumentedReason } from "@/data/cases";
import { usualDays } from "@/data/queue";
import { isoOf, minutesOf } from "@/data/patients";
import { canReuse, type VerificationException, type VerificationRecord } from "@/data/verification";
import { DAY } from "@/lib/time";

/** The id of the verification record a case uses. A case that carries one (from "Create authorization from verification", or once its own check ran) keeps it.
    A case on an existing episode uses that episode's record (the ledger case it came from), so a review reads the check the patient already has.
    Any other case has its own record, keyed by its case ID. Null while the case has no ID yet. */
export function verificationKey(d: Pick<CaseDraft, "verificationId" | "episodeId" | "caseId">): string | null {
  return d.verificationId ?? (d.episodeId ? d.episodeId.replace(/^EP-/, "") : d.caseId);
}

export interface Want {
  caseId: string;
  payerId: NonNullable<CaseDraft["payerId"]>;
  program: NonNullable<CaseDraft["program"]>;
  dosFrom: string;
  dosTo: string;
}

/** The dates of service the check should cover: the start date to the requested end, or the level of care's usual length. */
export function datesOfService(d: Pick<CaseDraft, "startDate" | "endDate" | "program">): { from: string; to: string } | null {
  if (!d.startDate) return null;
  const to = d.endDate && d.endDate >= d.startDate ? d.endDate : isoOf(minutesOf(d.startDate) + ((usualDays(d.program ?? "RES") ?? 1) - 1) * DAY);
  return { from: d.startDate, to };
}

/** The case has what a check needs: the payer, the level of care, the member ID and the start date. */
export const inputsReady = (d: CaseDraft): boolean => !!d.payerId && !!d.program && !!d.memberId.replace(/\W/g, "") && !!d.startDate;

/** What the case needs checked, under the record id `key`. Null until the payer, the level of care, the member ID and the start date are in. */
export function wantOf(d: CaseDraft, key: string): Want | null {
  const dos = datesOfService(d);
  if (!inputsReady(d) || !dos || !d.payerId || !d.program) return null;
  return { caseId: key, payerId: d.payerId, program: d.program, dosFrom: dos.from, dosTo: dos.to };
}

/** none: nothing to show yet and a check should run. current: reusable as it is. stale: the same patient, payer and program, but old or for other dates, so Refresh is offered.
    other: a record exists for another payer or level of care than the case now names, so it does not describe this case. needs_input: the case lacks what a check needs. */
export type VerificationStatus = "needs_input" | "none" | "current" | "stale" | "other";

export interface VerificationView {
  key: string | null;
  want: Want | null;
  record: VerificationRecord | undefined;
  status: VerificationStatus;
  /** Coverage is confirmed inactive for the dates. */
  inactive: boolean;
  /** The check could not run (Verify paused in Settings, or the service did not answer). */
  unavailable: boolean;
  /** The payer needs no authorization for this service. */
  noAuth: boolean;
  exceptions: VerificationException[];
  /** Hours since the check, on the demo clock. */
  ageHours: number | null;
  /** Why a stale check is stale: it is old, or it covers other dates than the case asks for. */
  staleBecause: "age" | "dates" | null;
}

export const reasonOf = (d: Pick<CaseDraft, "documented">, kind: DocumentedReason["kind"]): DocumentedReason | undefined => d.documented?.find((r) => r.kind === kind);

export function verificationView(d: CaseDraft, record: VerificationRecord | undefined, clock: number): VerificationView {
  const key = verificationKey(d);
  const want = wantOf(d, key ?? "");
  const same = !!record && !!d.payerId && !!d.program && record.payerId === d.payerId && record.program === d.program;
  const status: VerificationStatus = !want ? "needs_input" : !record || !key ? "none" : !same ? "other" : canReuse(record, want, clock) ? "current" : "stale";
  const usable = !!record && same;
  return {
    key, want, record, status,
    inactive: usable && record.coverage.state === "inactive",
    unavailable: usable && record.exceptions.includes("service_unavailable"),
    noAuth: usable && record.authRequirement === "not_required",
    exceptions: usable ? record.exceptions : [],
    ageHours: usable ? Math.max(0, Math.round((clock - record.checkedAt) / 60)) : null,
    staleBecause: status !== "stale" || !record || !want ? null : clock - record.checkedAt > 24 * 60 ? "age" : "dates",
  };
}

/** Wording for each exception, as the plain sentence and the next action. The exceptions warn; none of them stops the person from going on. */
export const EXCEPTION_TEXT: Record<VerificationException, { title: string; next: string }> = {
  coverage_inactive: { title: "Coverage is not active for these dates", next: "Check the member ID and the dates, or ask the plan. You can go on with a documented exception." },
  payer_changed: { title: "The member moved to another plan", next: "Switch the case to the new plan and check again." },
  member_id_mismatch: { title: "The plan did not match the member ID", next: "Correct the member ID in Patient & Service, or call the plan." },
  benefit_unconfirmed: { title: "The plan did not confirm this benefit", next: "Ask the plan to confirm the benefit before the request is signed." },
  service_not_covered: { title: "The plan says this service is not covered", next: "Check the level of care, or ask the plan about an exception." },
  provider_unresolved: { title: "The clinic's enrollment with this plan is not confirmed", next: "Confirm the clinic is in network with this plan." },
  service_unavailable: { title: "The check could not run", next: "Resume Verify in Settings and refresh, or go on with a documented exception." },
  requirement_unknown: { title: "No rule on file says whether this needs an authorization", next: "Ask the payer. Until then the request is prepared as if one is needed." },
};

/** One sentence about a check, for the summary on Review & submit and the line under a step: "Active, benefits covered, authorization required." */
export function describeVerification(rec: VerificationRecord | undefined): string {
  if (!rec) return "Not checked";
  if (rec.exceptions.includes("service_unavailable")) return "The check could not run";
  const cov = rec.coverage.state === "active" ? "Coverage active" : rec.coverage.state === "inactive" ? "Coverage not active for these dates" : "Coverage not confirmed";
  const ben = rec.benefits === "covered" ? "benefits covered" : rec.benefits === "limited" ? "benefits limited" : rec.benefits === "not_covered" ? "service not covered" : "benefit not confirmed";
  const auth = rec.authRequirement === "required" ? "authorization required" : rec.authRequirement === "concurrent" ? "concurrent review required" : rec.authRequirement === "not_required" ? "no authorization required" : "authorization requirement unknown";
  return `${cov}, ${ben}, ${auth}`;
}
