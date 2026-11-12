import type { HistoryItem } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import type { PsyRequest, Tone } from "@/data/types";
import type { DenialAnalysis } from "./analysis";

/* One History for a denial: the request's own events (what the Dashboard shows too) and the agents' reading of the letter, newest first.
   The feed puts the flag on the right: Agent, Decision (the payer), Logged decision (a person logged an outcome or a decision by hand), Scheduled. */

/** The words an event uses when the agents' reading of the letter is already in the request's history, so it is not listed twice. */
const SAME_STEP: Record<string, RegExp> = { reader: /removed identifiers/i, advocate: /checked the notice/i, historian: /compared .* similar/i };

/** A person logged what happened: an outcome of a call, a payer's decision on an appeal, or accepting the denial. Anything else a person did carries no flag. */
const LOGGED = /^You (logged|recorded|accepted)\b/;

/** The tone of the payer's line: approved is good, part of it is mid, a denial or an upheld decision is risk. */
function payerTone(text: string, r: PsyRequest): Tone {
  if (/upheld|denied/i.test(text)) return "risk";
  if (/did not approve the full/i.test(text)) return r.outcome === "denied" ? "risk" : "mid";
  if (/part/i.test(text)) return "mid";
  if (/overturned|restored|approved/i.test(text)) return "good";
  return "neutral";
}

const lowerFirst = (s: string): string => (s ? s[0].toLowerCase() + s.slice(1) : s);

export function denialHistory(r: PsyRequest, a: DenialAnalysis): HistoryItem[] {
  const events: HistoryItem[] = r.events.map((e) => ({
    key: e.id,
    at: e.at,
    actor: e.actor,
    text: e.text,
    detail: e.detail,
    scheduled: !e.done,
    flag: !e.done ? "scheduled" : e.actor === "you" ? (LOGGED.test(e.text) ? "logged" : null) : undefined,
    tone: e.actor === "payer" ? payerTone(e.text, r) : undefined,
  }));
  const reading: HistoryItem[] = a.steps
    .filter((s) => !r.events.some((e) => e.actor === s.agent && SAME_STEP[s.agent]?.test(e.text)))
    .map((s, i) => ({ key: `${r.id}-read-${s.agent}`, at: r.stageSince + 1 + i, actor: s.agent, text: `${AGENTS[s.agent].name} ${lowerFirst(s.text)}` }));
  return [...events, ...reading].sort((x, y) => y.at - x.at);
}
