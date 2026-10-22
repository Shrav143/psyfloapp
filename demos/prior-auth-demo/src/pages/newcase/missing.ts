import type { FixKind, IntegrityCheck } from "./checks";
import type { ValidationRow } from "./ValidationSummary";

/* "What is missing" on Review & submit: what holds the request back, blocking items first, each with the action that already exists for it.
   It reads the case's own issues (Intake and Eligibility & Benefits, see caseIssues.ts), the validation rows (documents and the start date)
   and the findings of the four checks that are not about one document. */

export interface MissingItem {
  id: string;
  label: string;
  text: string;
  /** "block" cannot be sent until it is fixed: no patient, payer, service or dates, coverage confirmed inactive with no documented exception, an unanswered duplicate.
      "ack" can be sent once the person acknowledges it. "note" does not stop sending; the payer may ask for it. */
  severity: "block" | "ack" | "note";
  fix?: FixKind;
}

export function missingItems(rows: ValidationRow[], checks: IntegrityCheck[], own: MissingItem[] = []): MissingItem[] {
  const fromRows = rows
    .filter((r) => r.warn)
    .map((r): MissingItem => ({ id: `row-${r.id}`, label: r.label, text: r.findings.filter((f) => !f.ok).map((f) => f.text).join(" "), severity: r.required ? "ack" : "note", fix: "records" }));
  const fromChecks = checks.flatMap((c) => c.extra.map((x, i): MissingItem => ({ id: `${c.id}-${i}`, label: x.label, text: x.text, severity: "ack", fix: x.fix })));
  const all = [...own, ...fromRows, ...fromChecks];
  return (["block", "ack", "note"] as const).flatMap((sev) => all.filter((m) => m.severity === sev));
}
