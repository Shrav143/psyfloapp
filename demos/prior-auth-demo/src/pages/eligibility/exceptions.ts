/* The words for each way a check can end that needs a look. A record carries the codes; this turns one into a title and a plain line that names what
   was found and what to do next. It never says what a payer decided, only what the check found. */
import { payerById } from "@/data/seed";
import { mdyOf, type VerificationException, type VerificationRecord } from "@/data/verification";
import { stamp } from "@/lib/time";

export interface ExceptionLine {
  code: VerificationException;
  title: string;
  text: string;
}

export const EXCEPTION_TITLE: Record<VerificationException, string> = {
  coverage_inactive: "Coverage is not active",
  payer_changed: "The payer changed",
  member_id_mismatch: "Member ID does not match",
  benefit_unconfirmed: "Benefit not confirmed",
  service_not_covered: "Service not covered",
  provider_unresolved: "Provider participation not confirmed",
  service_unavailable: "Verification service unavailable",
  requirement_unknown: "Authorization requirement unknown",
};

/** One line for each warning on a record, in the record's order. */
export function exceptionLines(rec: VerificationRecord): ExceptionLine[] {
  const p = rec.row;
  const who = payerById(rec.payerId)?.shortName ?? "The payer";
  const line = (code: VerificationException): ExceptionLine => ({ code, title: EXCEPTION_TITLE[code], text: textFor(code) });
  const textFor = (code: VerificationException): string => {
    switch (code) {
      case "coverage_inactive":
        return `Coverage ${p.eligibility.state === "lapsed" ? "lapsed" : "ended"} ${rec.coverage.ended ? mdyOf(rec.coverage.ended).slice(0, 5) : (p.eligibility.on ?? "")}. Ask the payer, or request retro-eligibility; a retro-authorization can cover the gap.`;
      case "payer_changed":
        return p.payerChanged ? `The member is with ${payerById(p.payerChanged.to)?.name ?? "another plan"} since ${p.payerChanged.since}. Start the request with the new plan.` : "The member is with another plan.";
      case "member_id_mismatch":
        return p.idMismatch ? `${who} has this member under the ID ending ${p.idMismatch.onFile.replace("…", "")}. Read the card again and use the plan's ID.` : "No member matched this ID and date of birth. Read the card again.";
      case "benefit_unconfirmed":
        return `${who} did not confirm this service. Caller can confirm the benefit by phone. Billing waits for the answer.`;
      case "service_not_covered":
        return `${who} does not cover this service. Ask which program it pays for.`;
      case "provider_unresolved":
        return `The clinic's enrollment with ${who} could not be confirmed. Navigator can check the enrollment record.`;
      case "service_unavailable":
        return p.refreshFailed !== undefined ? `The refresh at ${stamp(p.refreshFailed)} could not run because Verify is paused in Settings. This is the last result.` : "Verify is paused in Settings, so nothing was asked of the plan. Resume Verify, then refresh.";
      case "requirement_unknown":
        return `No rule on file says whether ${who} requires an authorization for this service. Check with ${who}. Nothing was assumed.`;
    }
  };
  return rec.exceptions.map(line);
}

/** The authorization requirement as a chip. The line beside it says who requires what, for which dates. */
export const REQUIREMENT_LABEL: Record<VerificationRecord["authRequirement"], string> = {
  required: "Required",
  concurrent: "Concurrent review",
  not_required: "Not required",
  unknown: "Unknown",
};
