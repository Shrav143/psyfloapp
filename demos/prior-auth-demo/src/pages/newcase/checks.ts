/* The four checks shown on the review step. Each one reads the case, the payer's saved documents and rules, and the agents' run:
   pass, warn (can be signed after an acknowledgement) or checking. Nothing here blocks: what blocks a signature is in caseIssues.ts. */
import type { CaseDraft, NarrativeSection } from "@/data/cases";
import { payerById } from "@/data/seed";
import type { AgentKey } from "@/data/types";
import type { VerificationRecord } from "@/data/verification";
import { docEntries, findingText, isOpen, openFindings, slotLabel } from "./documents";
import { noAuthLine, startDateIssue } from "./payerRules";
import type { PayerContext } from "./payerContext";
import { criteriaCount } from "./runText";
import { serviceWindowIssue, VA_CRITERIA_PENDING } from "@/data/programTables";

export type CheckState = "pass" | "warn" | "checking";
/** What a person can do about a finding: go back to a step (Intake, Eligibility & Benefits, Clinical documentation), edit the summary, or send the draft back to Scribe. */
export type FixKind = "intake" | "eligibility" | "records" | "edit" | "scribe";
export interface IntegrityCheck {
  id: string;
  agent: AgentKey;
  label: string;
  state: CheckState;
  /** One line for each thing found. Empty for a pass. */
  details: string[];
  /** The findings the validation summary does not list by document (coverage, the summary itself, a missing step-down), each with its fix when there is one. */
  extra: { label: string; text: string; fix?: FixKind }[];
}

/** What the checks read besides the draft: the demo clock, what Payers has saved for this payer, and the case's verification record when there is one. */
export interface CheckInput {
  clock: number;
  ctx: PayerContext;
  verification?: VerificationRecord;
}

/** A Virginia service: Criteria has nothing configured to match the chart against, and says so rather than assume a criterion. */
const NO_CRITERIA = "Criteria has no Virginia criteria to match the chart against for this service. Nothing was assumed.";
const noun = (n: number): string => (n === 1 ? "document" : "documents");
const list = (names: string[]): string => (names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`);

export function integrityChecks(d: CaseDraft, narrative: NarrativeSection[], rechecking: boolean, { clock, ctx, verification }: CheckInput): IntegrityCheck[] {
  const payer = d.payerId ? payerById(d.payerId).shortName : "the payer";
  const required = docEntries(d.payerId, d.program, ctx.items).filter((r) => r.required);
  const inCase = (slot: string): boolean => d.documents.some((x) => x.slot === slot);
  const absent = required.filter((r) => !inCase(r.slot) && !(r.slot in d.unavailable));
  const unavailable = required.filter((r) => !inCase(r.slot) && r.slot in d.unavailable);
  const flawed = d.documents.filter((x) => required.some((r) => r.slot === x.slot) && openFindings(x, d.answers) > 0);
  const lost = verification?.coverage.state === "inactive";
  const emptySection = narrative.find((s) => !s.text.trim());

  const traced: IntegrityCheck = rechecking
    ? { id: "traced", agent: "integrity", label: "Every sentence traced to the chart", state: "checking", details: ["Integrity is re-checking your edits"], extra: [] }
    : emptySection
      ? { id: "traced", agent: "integrity", label: "Every sentence traced to the chart", state: "warn", details: [`The "${emptySection.heading}" section is empty. Add the text or send the draft back to Scribe.`], extra: [{ label: "Summary", text: `The "${emptySection.heading}" section is empty. Add the text or send the draft back to Scribe.`, fix: "edit" }] }
      : { id: "traced", agent: "integrity", label: "Every sentence traced to the chart", state: "pass", details: [], extra: [] };

  const issue = startDateIssue(d, ctx.rules, clock, payer);
  /* A Virginia service asked for outside its dates: a redesigned service before it starts, or a retiring one after it ends (data/va/services.ts). */
  const outside = serviceWindowIssue(d.program, d.startDate);
  const late = (d.dueKind === "notice" || d.dueKind === "window") && d.dueAt !== null && d.dueAt <= clock;
  /* Coverage itself is listed by the case's own issues (caseIssues.ts); only what the agents' run found is listed here. */
  const lead: { label: string; text: string; fix?: FixKind }[] = [
    ...(d.run.skipped.includes("verify") ? [{ label: "Coverage not confirmed", text: `Verify could not reach ${payer}'s portal, so coverage was not confirmed. You skipped it and noted it.` }] : []),
  ];
  const overdue = late ? [{ label: "Deadline", text: d.dueKind === "notice" ? `The notice to ${payer} was due and has passed. The request goes late.` : "The window for this retro-authorization has passed. The request goes late." }] : [];
  const errors = [
    ...(lost ? ["Coverage is not active for these dates. See Eligibility & Benefits."] : []),
    ...lead.map((x) => x.text),
    ...(flawed.length ? [`${flawed.length} required ${flawed.length === 1 ? "document has" : "documents have"} an open finding. See the validation summary.`] : []),
    ...(issue ? [issue.text] : []),
    ...overdue.map((x) => x.text),
    ...(outside ? [outside] : []),
  ];

  /* Criteria matches the chart to the payer's requirements. A required document that is not in the case leaves one of them without evidence. */
  const n = criteriaCount(d.program ?? "RES");
  const stepdownLater = d.answers.some((a) => a.key === "stepdown" && a.choice === "later");
  const unmet = [
    ...(absent.length ? [`${absent.length} required ${noun(absent.length)} ${absent.length === 1 ? "is" : "are"} not in the case: ${list(absent.map((r) => r.label))}. Add ${absent.length === 1 ? "it" : "them"} on Clinical documentation, or mark ${absent.length === 1 ? "it" : "them"} not available.`] : []),
    ...(unavailable.length ? [`${list(unavailable.map((r) => r.label))} ${unavailable.length === 1 ? "is" : "are"} marked not available, so ${payer} has no evidence for ${unavailable.length === 1 ? "it" : "them"}.`] : []),
    ...(stepdownLater ? ["A named step-down provider is not on file yet."] : []),
  ];
  const uncovered = absent.length + unavailable.length + (stepdownLater ? 1 : 0);

  /* Placement reads the ASAM assessment, the chart's own statement of the level of care, and the payer's no-authorization rule. */
  const asam = d.documents.find((x) => x.slot === "asam");
  const noAuth = noAuthLine(ctx.rules, d.program);
  /* A Virginia service has no level-of-care framework configured: the check says so instead of reading an ASAM assessment. */
  const placement = [
    ...(n === null ? [`${VA_CRITERIA_PENDING}.`] : []),
    ...(n !== null && !asam ? ["No ASAM assessment is in the case, so the level of care is not confirmed."] : []),
    ...(n !== null && asam ? asam.findings.filter((f) => isOpen(f, d.answers)).map((f) => `${slotLabel("asam")}: ${findingText(f, d.answers)}.`) : []),
    ...(noAuth ? [`${payer}'s rules say: ${noAuth}. Check with ${payer} before you send.`] : []),
  ];
  const noAuthExtra = noAuth ? [{ label: "Payer rule", text: `${payer}'s rules say: ${noAuth}. Check with ${payer} before you send.` }] : [];

  return [
    traced,
    { id: "errors", agent: "scrubber", label: "Request has no errors", state: errors.length ? "warn" : "pass", details: errors, extra: [...lead, ...overdue, ...(outside ? [{ label: "Service dates", text: outside }] : [])] },
    { id: "criteria", agent: "criteria", label: n === null ? `No ${payer} criteria configured for this service` : uncovered ? `${Math.max(0, n - uncovered)} of ${n} ${payer} requirements covered` : `All ${n} ${payer} requirements covered`, state: unmet.length || n === null ? "warn" : "pass", details: n === null ? [NO_CRITERIA, ...unmet] : unmet, extra: [...(n === null ? [{ label: "Criteria", text: NO_CRITERIA }] : []), ...(stepdownLater ? [{ label: "Step-down provider", text: "A named step-down provider is not on file yet.", fix: "scribe" as FixKind }] : [])] },
    { id: "level", agent: "placement", label: n === null ? "Level-of-care criteria pending" : "Level of care matches the request", state: placement.length ? "warn" : "pass", details: placement, extra: [...(n === null ? [{ label: "Level of care", text: `${VA_CRITERIA_PENDING}.` }] : []), ...noAuthExtra] },
  ];
}

export const checkSummary = (checks: IntegrityCheck[]): { tone: "good" | "mid" | "risk" | "neutral"; text: string } => {
  if (checks.some((c) => c.state === "checking")) return { tone: "neutral", text: "Re-checking" };
  const warns = checks.filter((c) => c.state === "warn").length;
  return warns ? { tone: "mid", text: warns === 1 ? "1 warning" : `${warns} warnings` } : { tone: "good", text: "All clear" };
};
