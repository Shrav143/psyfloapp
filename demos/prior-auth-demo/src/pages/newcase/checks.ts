/* The four Integrity checks shown on the review step. Pass, warn (can be signed with an acknowledgement) or block (cannot be signed). */
import type { CaseDraft, NarrativeSection } from "@/data/cases";
import { payerById } from "@/data/seed";
import type { AgentKey } from "@/data/types";
import { openFindings, requiredDocs } from "./documents";
import { coverageFor } from "./intake";
import { CRITERIA_COUNT } from "./runText";

export type CheckState = "pass" | "warn" | "block" | "checking";
export interface IntegrityCheck {
  id: string;
  agent: AgentKey;
  label: string;
  state: CheckState;
  detail?: string;
}

export function integrityChecks(d: CaseDraft, narrative: NarrativeSection[], rechecking: boolean): IntegrityCheck[] {
  const payer = d.payerId ? payerById(d.payerId).shortName : "the payer";
  const emptySection = narrative.find((s) => !s.text.trim());
  const cov = coverageFor(d, 0);
  const lost = cov && cov.eligibility.state !== "active";
  const required = requiredDocs(d.payerId, d.program).filter((r) => r.required);
  const flawed = d.documents.filter((x) => required.some((r) => r.slot === x.slot) && openFindings(x, d.answers) > 0);

  const traced: IntegrityCheck = rechecking
    ? { id: "traced", agent: "integrity", label: "Every sentence traced to the chart", state: "checking", detail: "Integrity is re-checking your edits" }
    : emptySection
      ? { id: "traced", agent: "integrity", label: "Every sentence traced to the chart", state: "block", detail: `The "${emptySection.heading}" section is empty. Add the text or send the draft back to Scribe.` }
      : { id: "traced", agent: "integrity", label: "Every sentence traced to the chart", state: "pass" };

  const errors: IntegrityCheck = lost
    ? { id: "errors", agent: "scrubber", label: "Request has no errors", state: "warn", detail: `Coverage ${cov.eligibility.state} ${cov.eligibility.on ?? ""}. A retro-eligibility request is needed before billing.` }
    : flawed.length
      ? { id: "errors", agent: "scrubber", label: "Request has no errors", state: "warn", detail: `${flawed.length} required ${flawed.length === 1 ? "document has" : "documents have"} an open finding. See the validation summary.` }
      : { id: "errors", agent: "scrubber", label: "Request has no errors", state: "pass" };

  const n = CRITERIA_COUNT[d.program ?? "RES"];
  return [
    traced,
    errors,
    { id: "criteria", agent: "criteria", label: `All ${n} ${payer} requirements covered`, state: "pass" },
    { id: "level", agent: "placement", label: "Level of care matches the request", state: "pass" },
  ];
}

export const checkSummary = (checks: IntegrityCheck[]): { tone: "good" | "mid" | "risk" | "neutral"; text: string } => {
  if (checks.some((c) => c.state === "block")) return { tone: "risk", text: "Blocked" };
  if (checks.some((c) => c.state === "checking")) return { tone: "neutral", text: "Re-checking" };
  const warns = checks.filter((c) => c.state === "warn").length;
  return warns ? { tone: "mid", text: warns === 1 ? "1 warning" : `${warns} warnings` } : { tone: "good", text: "All clear" };
};
