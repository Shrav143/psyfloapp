/* What each agent says it is doing and what it found, for the run page, the Case Manager rows and the Dashboard note. */
import { AGENTS } from "@/data/agents";
import { isModuleSigned, serviceName } from "@/data/assess/carePlan";
import type { IntakeRecord } from "@/data/intake/types";
import { AI_DRAFT_TAG } from "./recordNarrative";
import { chanceRange, currentChance, draftState, QUESTIONS, RUN_STEPS, similarCases, type CaseDraft } from "@/data/cases";
import { simulateCheck } from "@/data/eligibility";
import { payerById } from "@/data/seed";
import { forProgram, NOT_ENOUGH_CASES, VA_CRITERIA_PENDING } from "@/data/programTables";
import { isCoreProgram, PROGRAM_LABEL, type AgentKey, type Program, type CoreProgram } from "@/data/types";

const ASAM: Record<CoreProgram, string> = { RES: "3.5", IOP: "2.1", PHP: "2.5", WM: "3.7-WM" };
const CRITERIA_COUNT: Record<CoreProgram, number> = { RES: 9, IOP: 7, PHP: 8, WM: 6 };
/** How many of the payer's requirements Criteria matches, or null for a Virginia service: no criteria are configured for it. */
export const criteriaCount = (p: Program): number | null => forProgram<number | null>(CRITERIA_COUNT, p, null);

export interface RowText {
  wait: string;
  doing: string;
  done: string;
  /** What the row says when the agent could not finish. Only Verify can fail. */
  failed?: string;
}

/** What a request prepared from an intake record needs to say about itself: the record, and how many of the payer's listed documents are attached. */
export interface RecordFacts {
  intake: IntakeRecord | undefined;
  ready: number;
  total: number;
}

/** The agents' lines for a request prepared from an intake record. Honest ones stay (Reader read the record, Criteria listed what is missing); the ones that would claim a criteria match, a level of care the record supports
    or an approval estimate say plainly that they do none of that. The clinician selected the service and a person signs. */
function recordRow(agent: AgentKey, d: CaseDraft, who: string, facts: RecordFacts): RowText | null {
  const r = facts.intake;
  const signed = r ? Object.keys(r.instruments ?? {}).filter((id) => isModuleSigned(r, id as Parameters<typeof isModuleSigned>[1])).length : 0;
  const sel = d.serviceNote?.selected ?? null;
  switch (agent) {
    case "reader":
      return { wait: "Will read the intake record", doing: "Reading the intake record: the referral, the signed assessment work and the care plan", done: `Read ${r?.id ?? "the intake record"}: ${signed} signed ${signed === 1 ? "module" : "modules"}, the care plan and ${r?.documents.length ?? 0} documents on file. Files were not opened` };
    case "criteria":
      return { wait: `Will compare ${who}'s document list with what is attached`, doing: `Comparing ${who}'s document list with what is attached`, done: `Documentation checklist: ${facts.ready} of ${facts.total} items on the list are attached. Payer requirement not yet verified` };
    case "historian":
      return { wait: "Not used for a request prepared from an intake record", doing: "Skipping the decision history", done: "Skipped on purpose. No decision history is used for a request prepared from an intake record" };
    case "placement":
      return { wait: "Will compare the service with the clinician's selection", doing: "Comparing the service with the clinician's selection", done: sel ? `The service is the clinician's selection: ${serviceName(sel)}. Placement did not choose or support a level of care` : "No clinician has selected a service. Placement did not choose one" };
    case "forecaster":
      return { wait: "Makes no estimate of approval for this request", doing: "Skipping the estimate of approval", done: "No estimate of approval is made for a request prepared from an intake record" };
    case "scribe":
      return { wait: "Will draft the summary from the record", doing: "Drafting the medical-necessity summary from the record", done: `Drafted the summary from the record, each section under its source. ${AI_DRAFT_TAG}. A clinician edits and signs it` };
    case "integrity":
      return { wait: "Will check that each section names its source", doing: "Checking that each section names its source in the record", done: "Each section names its source in the record. Integrity did not judge the clinical content" };
    case "packet":
      return { wait: "Will assemble the packet from what is attached", doing: "Assembling the packet from what is attached", done: `Assembled the packet: ${d.documents.length} ${d.documents.length === 1 ? "attachment" : "attachments"} from the record and this draft (simulated)` };
    case "scrubber":
      return { wait: "Will check the draft for missing fields and dates", doing: "Checking the draft for missing fields and dates", done: "Checked the draft for missing fields and dates" };
    default:
      return null;
  }
}

export function rowText(agent: AgentKey, d: CaseDraft, facts?: RecordFacts): RowText {
  const payer = d.payerId ? payerById(d.payerId) : null;
  const who = payer?.shortName ?? "the payer";
  const fromRecord = d.intakeId && facts ? recordRow(agent, d, who, facts) : null;
  if (fromRecord) return fromRecord;
  const program = d.program ?? "RES";
  const prog = PROGRAM_LABEL[program];
  const sim = d.payerId ? simulateCheck({ payerId: d.payerId, program, memberId: d.memberId, dos: d.startDate }) : null;
  const n = criteriaCount(program);
  const core = isCoreProgram(program);
  const files = d.documents.length;
  const sc = d.payerId ? similarCases(d.payerId, program) : { total: 0, own: 0, network: 0, benchmark: 0 };
  const chance = currentChance(d);
  const range = chanceRange(chance, true);
  const attachments = Math.max(1, files);
  const text: Record<AgentKey, RowText> = {
    reader: { wait: "Will read the chart and protect identifiers", doing: "Reading the chart and swapping names, dates and IDs for codes", done: `Read ${files} files and found ${files * 27 - 2} facts. Identifiers are now codes` },
    verify: {
      wait: "Will check coverage and benefits",
      doing: `Checking coverage and benefits with ${who}`,
      done: d.run.skipped.includes("verify")
        ? `Skipped. ${who}'s portal could not be reached, so coverage is not confirmed`
        : `Coverage is ${sim?.eligibility.state === "active" || !sim ? "active" : "not active"} and ${sim?.auth === "not_required" ? "no authorization is needed" : "prior authorization is required"}${d.intakeId ? " (simulated response)" : ""}`,
      failed: `Could not reach ${who}'s portal. Coverage is not confirmed yet`,
    },
    criteria: { wait: `Will read ${who}'s criteria and match the chart`, doing: `Reading ${who}'s current criteria and matching the chart`, done: n !== null ? `Matched the chart to ${who}'s criteria: ${n} of ${n} requirements met` : `No ${who} criteria are configured for ${prog}. Nothing was matched or assumed` },
    historian: { wait: `Will review how ${who} ruled on similar requests`, doing: `Reviewing how ${who} ruled on similar requests`, done: sc.total ? `Reviewed ${sc.total.toLocaleString("en-US")} similar ${who} decisions: ${sc.own} your own, ${sc.network} network, ${sc.benchmark} benchmark` : `No similar ${who} decisions for ${prog} in the demo's data yet` },
    placement: core
      ? { wait: "Will map the chart to ASAM levels", doing: "Mapping the chart to ASAM levels", done: `The chart supports ${prog} (ASAM ${ASAM[program]})` }
      : { wait: "Will check the level-of-care framework", doing: "Checking the level-of-care framework", done: VA_CRITERIA_PENDING },
    forecaster: { wait: "Will estimate the approval chance", doing: "Estimating the approval chance", done: core ? `Approval chance ${chance}%, likely ${range.lo}-${range.hi}%` : `Approval chance: ${NOT_ENOUGH_CASES}` },
    scribe: { wait: "Will write the medical-necessity summary", doing: "Writing the medical-necessity summary", done: "Drafted the medical-necessity summary" },
    integrity: { wait: "Will check every sentence against the chart", doing: "Checking every sentence against the chart", done: "Every sentence traces to the chart" },
    packet: { wait: `Will assemble ${who}'s forms and attachments`, doing: `Assembling ${who}'s form and the attachments`, done: `Assembled ${who}'s form with ${attachments} attachments` },
    scrubber: { wait: "Will check the request for errors before it goes", doing: "Checking the request for errors before it goes", done: "Checked the request for errors. None found" },
    caller: { wait: "", doing: "", done: "" },
    navigator: { wait: "", doing: "", done: "" },
    cadence: { wait: "", doing: "", done: "" },
    advocate: { wait: "", doing: "", done: "" },
    sentinel: { wait: "", doing: "", done: "" },
    analyst: { wait: "", doing: "", done: "" },
  };
  return text[agent];
}

/** Who has the draft right now: the agent that is working, the one that asked, or Integrity once everything passed. */
export function agentNow(d: CaseDraft): AgentKey {
  const s = draftState(d);
  if (s === "question" && d.run.question) return QUESTIONS[d.run.question].agent;
  if (s === "ready") return "integrity";
  if (s === "intake") return "reader";
  return RUN_STEPS[Math.min(d.run.done, RUN_STEPS.length - 1)].agent;
}

const LINE: Partial<Record<AgentKey, (d: CaseDraft, who: string) => string>> = {
  reader: (d) => (d.intakeId ? "is reading the intake record" : "is reading the chart"),
  verify: () => "is checking coverage and benefits",
  criteria: (d, who) => (d.intakeId ? "is comparing the document list with what is attached" : `is reading ${who}'s rules`),
  historian: (d, who) => (d.intakeId ? "is skipping the decision history" : `is reviewing how ${who} ruled on similar requests`),
  placement: (d) => (d.intakeId ? "is comparing the service with the clinician's selection" : d.program && !isCoreProgram(d.program) ? "is checking the level-of-care framework" : "is mapping the chart to ASAM levels"),
  forecaster: (d) => (d.intakeId ? "is skipping the estimate of approval" : "is estimating the approval chance"),
  scribe: (d) => (d.intakeId ? "is drafting the summary from the record" : "is writing the medical-necessity summary"),
  integrity: (d) => (d.intakeId ? "is checking that each section names its source" : "is checking every sentence against the chart"),
  packet: (d) => (d.type === "Retro-authorization" ? "is assembling the request from the detox chart" : "is assembling the forms and attachments"),
  scrubber: () => "is checking the request for errors",
};

/** One line for the Case Manager row. */
export function runLine(d: CaseDraft): string {
  const s = draftState(d);
  if (d.run.failed) return `${AGENTS[d.run.failed].name} could not reach ${d.payerId ? payerById(d.payerId).shortName : "the payer"}'s portal. Retry it or skip it`;
  if (s === "question" && d.run.question) return d.type === "Recertification" ? QUESTIONS[d.run.question].line : QUESTIONS[d.run.question].line.replace("the recertification", "the request");
  if (s === "ready") return d.intakeId ? "The agents finished the draft. Waiting for a clinician to sign" : "Integrity and Scrubber passed. Waiting for a clinician to sign";
  if (s === "intake") return "Patient & Service is not finished. Add the person and the payer to start the agents";
  const agent = agentNow(d);
  const who = d.payerId ? payerById(d.payerId).shortName : "the payer";
  return `${AGENTS[agent].name} ${LINE[agent]?.(d, who) ?? "is working"}`;
}

/** The note the Dashboard shows under a Preparing request, in the same words the seed data uses. */
export function dashboardNote(d: CaseDraft): string {
  const s = draftState(d);
  if (d.run.failed) return `Needs your input. ${AGENTS[d.run.failed].name} could not finish`;
  if (s === "question" && d.run.question) return `Needs your input. ${AGENTS[QUESTIONS[d.run.question].agent].name} has a question`;
  if (s === "ready") return d.intakeId ? "Ready to sign. A clinician reviews the draft" : "Ready to sign. All four checks passed";
  return runLine(d);
}
