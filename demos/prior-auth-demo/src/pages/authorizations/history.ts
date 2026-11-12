import type { HistoryItem } from "@/components/ui";
import type { LogEntry } from "@/data/caseModel";
import type { PsyRequest, RequestEvent, Tone } from "@/data/types";

/* The request's one History: what the store recorded on the request (request.events), plus what was done on this page (the case's log).
   Flags: what a person logged on this page is a Logged decision, an agent's line is Agent, the payer's answer is a Decision, a planned line is Scheduled.
   A line that is in both places shows once: the request repeats the page's dismissals word for word, and records an added note and an apply
   in its own words at the same minute. Nothing here is made up: no line, no history. */

/** The payer's answer, by what it says (and by the request's outcome when the words are general). */
function decisionTone(text: string, outcome: PsyRequest["outcome"]): Tone {
  if (/asked for more information/i.test(text)) return "mid";
  if (/restored the requested|approved the request|overturned/i.test(text)) return "good";
  if (/part|did not approve the full/i.test(text)) return outcome === "denied" ? "risk" : "mid";
  if (/denied|upheld/i.test(text)) return "risk";
  return outcome === "approved" ? "good" : outcome === "partly_approved" ? "mid" : outcome === "denied" ? "risk" : "neutral";
}

/** The request's own line that says the same as a line logged on this page at the same minute. */
const mirrors = (e: RequestEvent, log: LogEntry[]): boolean =>
  log.some((l) => l.at === e.at && (l.text === e.text || (/^You added clinical context/.test(e.text) && /^You added clinical context/.test(l.text)) || (/ added \d+ items? to the draft/.test(e.text) && / applied "/.test(l.text))));

export function historyOf(request: PsyRequest | undefined, log: LogEntry[]): HistoryItem[] {
  const events: HistoryItem[] = (request?.events ?? [])
    .filter((e) => !mirrors(e, log))
    .map((e) => ({ key: e.id, at: e.at, actor: e.actor, text: e.text, detail: e.detail, scheduled: !e.done, tone: e.actor === "payer" ? decisionTone(e.text, request?.outcome) : undefined }));
  const mine: HistoryItem[] = log.map((l, i) => ({ key: `log-${i}-${l.at}`, at: l.at, actor: l.actor, text: l.text, flag: l.actor === "you" ? "logged" : undefined }));
  // Planned lines first (soonest first), then what happened, newest first. Reversing first keeps the last of two lines at the same minute on top, and the request's own events (sent after what was done on this page) above this page's.
  return [...mine, ...events].reverse().sort((a, b) => (!!a.scheduled !== !!b.scheduled ? (a.scheduled ? -1 : 1) : a.scheduled ? a.at - b.at : b.at - a.at));
}
