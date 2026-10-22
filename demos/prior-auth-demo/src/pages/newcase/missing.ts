import type { FixKind, IntegrityCheck } from "./checks";
import type { ValidationRow } from "./ValidationSummary";

/* "What is missing" on Review and sign: what holds the request back, blocking items first, each with the action that already exists for it.
   It reads the validation rows (documents and the start date) and the findings of the four checks that are not about one document. */

export interface MissingItem {
  id: string;
  label: string;
  text: string;
  /** "block" cannot be signed until it is fixed. "ack" can be signed once the person acknowledges it. "note" does not stop signing; the payer may ask for it. */
  severity: "block" | "ack" | "note";
  fix?: FixKind;
}

export function missingItems(rows: ValidationRow[], checks: IntegrityCheck[]): MissingItem[] {
  const fromRows = rows
    .filter((r) => r.warn)
    .map((r): MissingItem => ({ id: `row-${r.id}`, label: r.label, text: r.findings.filter((f) => !f.ok).map((f) => f.text).join(" "), severity: r.blocks ? "block" : r.required ? "ack" : "note", fix: "records" }));
  /** The only finding outside the validation rows that blocks is an empty section of the summary (fix: edit it). */
  const fromChecks = checks.flatMap((c) =>
    c.extra.map((x, i): MissingItem => ({ id: `${c.id}-${i}`, label: c.label, text: x.text, severity: x.fix === "edit" ? "block" : "ack", fix: x.fix })),
  );
  const all = [...fromRows, ...fromChecks];
  return (["block", "ack", "note"] as const).flatMap((sev) => all.filter((m) => m.severity === sev));
}
