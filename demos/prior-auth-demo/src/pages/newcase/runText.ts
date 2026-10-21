/* What each agent says it is doing and what it found, for the run page, the Active Cases rows and the Dashboard note. */
import { AGENTS } from "@/data/agents";
import { chanceRange, currentChance, draftState, QUESTIONS, RUN_STEPS, similarCases, type CaseDraft } from "@/data/cases";
import { simulateCheck } from "@/data/eligibility";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL, type AgentKey, type Program } from "@/data/types";

const ASAM: Record<Program, string> = { RES: "3.5", IOP: "2.1", PHP: "2.5", WM: "3.7-WM" };
export const CRITERIA_COUNT: Record<Program, number> = { RES: 9, IOP: 7, PHP: 8, WM: 6 };

export interface RowText {
  wait: string;
  doing: string;
  done: string;
}

export function rowText(agent: AgentKey, d: CaseDraft): RowText {
  const payer = d.payerId ? payerById(d.payerId) : null;
  const who = payer?.shortName ?? "the payer";
  const program = d.program ?? "RES";
  const prog = PROGRAM_LABEL[program];
  const sim = d.payerId ? simulateCheck({ payerId: d.payerId, program, memberId: d.memberId, dos: d.startDate }) : null;
  const n = CRITERIA_COUNT[program];
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
      done: `Coverage is ${sim?.eligibility.state === "active" || !sim ? "active" : "not active"} and ${sim?.auth === "not_required" ? "no authorization is needed" : "prior authorization is required"}`,
    },
    criteria: { wait: `Will read ${who}'s criteria and match the chart`, doing: `Reading ${who}'s current criteria and matching the chart`, done: `Matched the chart to ${who}'s criteria: ${n} of ${n} requirements met` },
    historian: { wait: `Will review how ${who} ruled on similar requests`, doing: `Reviewing how ${who} ruled on similar requests`, done: `Reviewed ${sc.total.toLocaleString("en-US")} similar ${who} decisions: ${sc.own} your own, ${sc.network} network, ${sc.benchmark} benchmark` },
    placement: { wait: "Will map the chart to ASAM levels", doing: "Mapping the chart to ASAM levels", done: `The chart supports ${prog} (ASAM ${ASAM[program]})` },
    forecaster: { wait: "Will estimate the approval chance", doing: "Estimating the approval chance", done: `Approval chance ${chance}%, likely ${range.lo}-${range.hi}%` },
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
  reader: () => "is reading the chart",
  verify: () => "is checking coverage and benefits",
  criteria: (_d, who) => `is reading ${who}'s rules`,
  historian: (_d, who) => `is reviewing how ${who} ruled on similar requests`,
  placement: () => "is mapping the chart to ASAM levels",
  forecaster: () => "is estimating the approval chance",
  scribe: () => "is writing the medical-necessity summary",
  integrity: () => "is checking every sentence against the chart",
  packet: (d) => (d.type === "Retro-authorization" ? "is assembling the request from the detox chart" : "is assembling the forms and attachments"),
  scrubber: () => "is checking the request for errors",
};

/** One line for the Active Cases row. */
export function runLine(d: CaseDraft): string {
  const s = draftState(d);
  if (s === "question" && d.run.question) return d.type === "Recertification" ? QUESTIONS[d.run.question].line : QUESTIONS[d.run.question].line.replace("the recertification", "the request");
  if (s === "ready") return "Integrity and Scrubber passed. Waiting for a clinician to sign";
  if (s === "intake") return "Intake is not finished. Add the chart and the payer to start the agents";
  const agent = agentNow(d);
  const who = d.payerId ? payerById(d.payerId).shortName : "the payer";
  return `${AGENTS[agent].name} ${LINE[agent]?.(d, who) ?? "is working"}`;
}

/** The note the Dashboard shows under a Preparing request, in the same words the seed data uses. */
export function dashboardNote(d: CaseDraft): string {
  const s = draftState(d);
  if (s === "question" && d.run.question) return `Needs your input. ${AGENTS[QUESTIONS[d.run.question].agent].name} has a question`;
  if (s === "ready") return "Ready to sign. All four checks passed";
  return runLine(d);
}
