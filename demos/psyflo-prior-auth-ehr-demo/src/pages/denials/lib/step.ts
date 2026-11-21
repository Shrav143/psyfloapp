import type { DenialMeta } from "@/data/denials";
import { payerById } from "@/data/seed";
import type { PsyRequest } from "@/data/types";
import { ACCEPT_BELOW, type DenialAnalysis, type OptionId } from "./analysis";
import { leftLabel } from "./format";

/** The six steps FLO can recommend. This is the whole vocabulary: no other word names a next step on this screen. */
export type StepWord = "Ask for reconsideration" | "Correct and resubmit" | "Peer-to-peer review" | "File an appeal" | "Accept" | "Investigate by hand";

export interface RecommendedStep {
  word: StepWord;
  /** The route in "Your options" the word stands for. Null for "Investigate by hand": no route is picked for the person. */
  option: OptionId | null;
  /** One or two plain sentences under the word, worked out from the live denial. */
  line: string;
  /** The reasons behind it, for the folded "Why FLO suggests this". */
  why: string[];
}

/** The denial carries its own way back in: the request is a Resubmission, or its clock counts the days left to resubmit. */
export const hasResubmitPath = (r: PsyRequest): boolean => r.type === "Resubmission" || r.clockSub === "to resubmit";

const lower = (s: string): string => (s ? s[0].toLowerCase() + s.slice(1) : s);

/** Time left on the nearest window of ours, in one phrase, or null when there is none to count. */
function windowPhrase(r: PsyRequest, clock: number): string | null {
  if (r.deadlineAt === undefined) return null;
  const left = r.deadlineAt - clock;
  const what = r.clockSub === "to resubmit" ? "The resubmission window" : r.clockSub === "to file" ? "The appeal window" : "The peer-to-peer window";
  return left > 0 ? `${what} closes in ${leftLabel(left)}.` : `${what} has closed.`;
}

/**
 * The recommended next step. A recommendation for review, never a payer rule: it is worked out from the denial type,
 * what the request itself shows (a resubmission path, how much time is left) and the route lib/analysis.ts already prefers.
 *
 * - A retro-authorization denial turns on dates and coverage status, so it reads "Accept" when the analysis says accept, otherwise "Investigate by hand".
 * - A late-notice or full denial that already has a resubmission path reads "Correct and resubmit": the findings name what to add.
 * - Everything else follows the preferred route: a call, a written appeal, or accepting.
 * - "Ask for reconsideration" is kept for a payer whose own rule names it. The demo's payer rules do not, so no denial maps to it here, and none is invented.
 */
export function recommendedStep(req: PsyRequest, meta: DenialMeta, a: DenialAnalysis, clock: number): RecommendedStep {
  const payer = payerById(req.payerId).shortName;
  const [call, written] = a.options;
  const window = windowPhrase(req, clock);
  const odds = (route: string, o: typeof call) => `${route} has a ${o.chance?.value}% chance of overturning (${lower(o.time)}). If it works: ${lower(a.regained)}.`;
  const evidence = `${a.similar} similar ${a.ctx.payer} decisions${a.benchmark ? ", fewer than 60, so the chances are a benchmark estimate" : ""}`;
  const chances = `Chance of overturning: call ${call.chance?.value}%, written appeal ${written.chance?.value}%, from ${evidence}.`;
  const closing = "This is a recommendation for a person to review. It is not a payer rule.";
  const ruleFor: Record<DenialAnalysis["recommendedBecause"], string> = {
    "low-chance": `FLO suggests accepting when the chance of overturning is below ${ACCEPT_BELOW}%.`,
    "appeal-clock": "FLO suggests the written route when the clock running is the one to file or resubmit.",
    "window-closed": "FLO suggests the written route once the call window has closed.",
    "late-notice": "FLO suggests the written route for a late-notice denial, because the receipt and the payer's record are paper evidence.",
    "call-window": "FLO suggests a call while the window is open: it is the fastest route to a reversal.",
  };
  const base = [`This is a ${meta.type.toLowerCase()} from ${payer}. ${a.verdictLine}`, chances, ...(window ? [window] : [])];

  if (meta.type === "Retro-authorization denied") {
    if (a.recommended === "accept")
      return { word: "Accept", option: "accept", line: "Accepting closes the denial, and Case Manager adds a step-down plan. Nothing is regained.", why: [...base, "Retro denials turn on dates and coverage status, and the chart does not yet give FLO enough to argue them.", ruleFor["low-chance"], closing] };
    return {
      word: "Investigate by hand",
      option: null,
      line: `A retro denial turns on dates and coverage status that a person has to confirm. Start with the ${a.findings.length} findings below and the eligibility check from the admission date.`,
      why: [...base, "FLO does not pick a route for a retro denial that might still be won: the dates need a person.", closing],
    };
  }

  if ((meta.type === "Late notice" || meta.type === "Full denial") && hasResubmitPath(req))
    return {
      word: "Correct and resubmit",
      option: "appeal",
      line: `Correct the request with the evidence in the findings below, then send it again (${lower(written.time)}). ${a.ask}`,
      why: [...base, "The request already has a way to be sent again, and the findings name what it was missing.", ruleFor[a.recommendedBecause], closing],
    };

  if (a.recommended === "accept") return { word: "Accept", option: "accept", line: "Accepting closes the denial, and Case Manager adds a step-down plan. Nothing is regained.", why: [...base, ruleFor["low-chance"], closing] };
  if (a.recommended === "appeal") return { word: "File an appeal", option: "appeal", line: odds("A written appeal", written), why: [...base, ruleFor[a.recommendedBecause], closing] };
  return { word: "Peer-to-peer review", option: "p2p", line: odds(`A call with ${payer}'s reviewer`, call), why: [...base, ruleFor["call-window"], closing] };
}
