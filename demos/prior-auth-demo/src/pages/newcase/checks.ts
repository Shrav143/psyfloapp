/* The four checks shown on the review step. Each one reads the case, the payer's saved documents and rules, and the agents' run:
   pass, warn (can be signed after an acknowledgement) or block (cannot be signed). */
import type { CaseDraft, NarrativeSection } from "@/data/cases";
import { verdictOf } from "@/data/eligibility";
import { payerById } from "@/data/seed";
import type { AgentKey } from "@/data/types";
import { buildResult } from "@/pages/eligibility/checks";
import { docEntries, findingText, isOpen, openFindings, slotLabel } from "./documents";
import { coverageFor } from "./intakeRules";
import { noAuthLine, startDateIssue } from "./payerRules";
import type { PayerContext } from "./payerContext";
import { CRITERIA_COUNT } from "./runText";

export type CheckState = "pass" | "warn" | "block" | "checking";
export interface IntegrityCheck {
  id: string;
  agent: AgentKey;
  label: string;
  state: CheckState;
  /** One line for each thing found. Empty for a pass. */
  details: string[];
}

/** What the checks read besides the draft: the demo clock and what Payers has saved for this payer. */
export interface CheckInput {
  clock: number;
  ctx: PayerContext;
}

const noun = (n: number): string => (n === 1 ? "document" : "documents");
const list = (names: string[]): string => (names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`);

export function integrityChecks(d: CaseDraft, narrative: NarrativeSection[], rechecking: boolean, { clock, ctx }: CheckInput): IntegrityCheck[] {
  const payer = d.payerId ? payerById(d.payerId).shortName : "the payer";
  const required = docEntries(d.payerId, d.program, ctx.items).filter((r) => r.required);
  const inCase = (slot: string): boolean => d.documents.some((x) => x.slot === slot);
  const absent = required.filter((r) => !inCase(r.slot) && !(r.slot in d.unavailable));
  const unavailable = required.filter((r) => !inCase(r.slot) && r.slot in d.unavailable);
  const flawed = d.documents.filter((x) => required.some((r) => r.slot === x.slot) && openFindings(x, d.answers) > 0);
  const cov = coverageFor(d, 0);
  const lost = !!cov && (cov.eligibility.state === "lapsed" || cov.eligibility.state === "ended");
  const emptySection = narrative.find((s) => !s.text.trim());

  const traced: IntegrityCheck = rechecking
    ? { id: "traced", agent: "integrity", label: "Every sentence traced to the chart", state: "checking", details: ["Integrity is re-checking your edits"] }
    : emptySection
      ? { id: "traced", agent: "integrity", label: "Every sentence traced to the chart", state: "block", details: [`The "${emptySection.heading}" section is empty. Add the text or send the draft back to Scribe.`] }
      : { id: "traced", agent: "integrity", label: "Every sentence traced to the chart", state: "pass", details: [] };

  const issue = startDateIssue(d, ctx.rules, clock, payer);
  const late = (d.dueKind === "notice" || d.dueKind === "window") && d.dueAt !== null && d.dueAt <= clock;
  const errors = [
    ...(cov && lost ? [`Coverage ${cov.eligibility.state} ${cov.eligibility.on ?? ""}`.trim() + ". A retro-eligibility request is needed before billing."] : []),
    ...(cov && !lost && verdictOf(cov) === "fix" ? [`Coverage needs a fix. ${buildResult(cov).reason}`] : []),
    ...(d.run.skipped.includes("verify") ? [`Verify could not reach ${payer}'s portal, so coverage was not confirmed. You skipped it and noted it.`] : []),
    ...(flawed.length ? [`${flawed.length} required ${flawed.length === 1 ? "document has" : "documents have"} an open finding. See the validation summary.`] : []),
    ...(issue ? [issue.text] : []),
    ...(late ? [d.dueKind === "notice" ? `The notice to ${payer} was due and has passed. The request goes late.` : "The window for this retro-authorization has passed. The request goes late."] : []),
  ];

  /* Criteria matches the chart to the payer's requirements. A required document that is not in the case leaves one of them without evidence. */
  const n = CRITERIA_COUNT[d.program ?? "RES"];
  const stepdownLater = d.answers.some((a) => a.key === "stepdown" && a.choice === "later");
  const unmet = [
    ...(absent.length ? [`${absent.length} required ${noun(absent.length)} ${absent.length === 1 ? "is" : "are"} not in the case: ${list(absent.map((r) => r.label))}. Add ${absent.length === 1 ? "it" : "them"} on Medical records, or mark ${absent.length === 1 ? "it" : "them"} not available.`] : []),
    ...(unavailable.length ? [`${list(unavailable.map((r) => r.label))} ${unavailable.length === 1 ? "is" : "are"} marked not available, so ${payer} has no evidence for ${unavailable.length === 1 ? "it" : "them"}.`] : []),
    ...(stepdownLater ? ["A named step-down provider is not on file yet."] : []),
  ];
  const uncovered = absent.length + unavailable.length + (stepdownLater ? 1 : 0);

  /* Placement reads the ASAM assessment, the chart's own statement of the level of care, and the payer's no-authorization rule. */
  const asam = d.documents.find((x) => x.slot === "asam");
  const noAuth = noAuthLine(ctx.rules, d.program);
  const placement = [
    ...(!asam ? ["No ASAM assessment is in the case, so the level of care is not confirmed."] : []),
    ...(asam ? asam.findings.filter((f) => isOpen(f, d.answers)).map((f) => `${slotLabel("asam")}: ${findingText(f, d.answers)}.`) : []),
    ...(noAuth ? [`${payer}'s rules say: ${noAuth}. Check with ${payer} before you send.`] : []),
  ];

  return [
    traced,
    { id: "errors", agent: "scrubber", label: "Request has no errors", state: errors.length ? "warn" : "pass", details: errors },
    { id: "criteria", agent: "criteria", label: uncovered ? `${Math.max(0, n - uncovered)} of ${n} ${payer} requirements covered` : `All ${n} ${payer} requirements covered`, state: absent.length ? "block" : unmet.length ? "warn" : "pass", details: unmet },
    { id: "level", agent: "placement", label: "Level of care matches the request", state: placement.length ? "warn" : "pass", details: placement },
  ];
}

export const checkSummary = (checks: IntegrityCheck[]): { tone: "good" | "mid" | "risk" | "neutral"; text: string } => {
  if (checks.some((c) => c.state === "block")) return { tone: "risk", text: "Blocked" };
  if (checks.some((c) => c.state === "checking")) return { tone: "neutral", text: "Re-checking" };
  const warns = checks.filter((c) => c.state === "warn").length;
  return warns ? { tone: "mid", text: warns === 1 ? "1 warning" : `${warns} warnings` } : { tone: "good", text: "All clear" };
};
