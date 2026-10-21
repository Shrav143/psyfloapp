import type { PsyRequest } from "@/data/types";
import { longDate } from "@/lib/time";
import type { DenialAnalysis } from "./analysis";

/** The appeal letter Advocate drafts. Every sentence comes from the findings, so Integrity can check it against the chart. */
export function buildAppealLetter(r: PsyRequest, a: DenialAnalysis, clock: number): string {
  const reasons = a.findings.map((f, i) => `${i + 1}. ${f.title}. ${f.detail} (Evidence: ${f.source}.)`).join("\n\n");
  return [
    `${a.ctx.payerName}`,
    "Appeals Department",
    "",
    `Date: ${longDate(clock)}`,
    `Re: Request for reconsideration of ${r.id}. ${a.ctx.who}, ${a.ctx.program}.`,
    "",
    `I am writing to appeal the decision on ${r.id}. ${a.quote}`,
    "",
    `The chart supports a different reading. ${a.chartShows}`,
    "",
    "Why the decision should be reconsidered",
    "",
    reasons,
    "",
    "What I am asking for",
    "",
    a.ask,
    "",
    "I am available to speak with the reviewing physician at any time inside the payer's window.",
  ].join("\n");
}

export function defaultEvidence(a: DenialAnalysis, fixes: string[]): string[] {
  const added = a.findings.filter((f) => fixes.includes(f.id)).map((f) => f.fix);
  return [...a.findings.map((f) => f.source), ...added.filter((x) => !a.findings.some((f) => f.source === x))];
}
