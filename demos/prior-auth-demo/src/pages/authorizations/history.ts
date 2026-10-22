import type { LogEntry } from "@/data/caseModel";
import type { AgentKey, PsyRequest, RequestEvent } from "@/data/types";

/* The request's History on the case page: what the store recorded on the request (request.events), plus what was done on this page.
   A line that is in both places shows once. Nothing here is made up: no line, no history. */

export interface HistoryLine {
  key: string;
  at: number;
  /** A person or a named agent. "payer" and "system" lines are labelled by what they are. */
  actor: AgentKey | "you" | "payer" | "system";
  text: string;
  detail?: string;
  /** Planned, not done yet. */
  scheduled: boolean;
}

export function historyOf(request: PsyRequest | undefined, log: LogEntry[]): HistoryLine[] {
  const events: HistoryLine[] = (request?.events ?? []).map((e: RequestEvent) => ({ key: e.id, at: e.at, actor: e.actor, text: e.text, detail: e.detail, scheduled: !e.done }));
  const seen = new Set(events.map((e) => e.text));
  const mine: HistoryLine[] = log.filter((l) => !seen.has(l.text)).map((l, i) => ({ key: `log-${i}-${l.at}`, at: l.at, actor: l.actor, text: l.text, scheduled: false }));
  // Planned lines first (soonest first), then what happened, newest first. Reversing first keeps the last of two lines at the same minute on top, and the request's own events (sent after what was done on this page) above this page's.
  return [...mine, ...events].reverse().sort((a, b) => (a.scheduled !== b.scheduled ? (a.scheduled ? -1 : 1) : a.scheduled ? a.at - b.at : b.at - a.at));
}
