/* What FLO reads from the demo data: who needs a person, what is due, which authorizations end, which denial deadlines are close.
   The Dashboard's "Summary from FLO" and the Ask FLO answers both come from here, so the two never disagree.
   Everything is worked out from the store each time it is asked, so it moves with the demo clock and with every request. */
import type { LedgerCase } from "@/data/manager";
import { openItems, type QueueItem } from "@/data/queue";
import { payerById } from "@/data/seed";
import type { PsyRequest } from "@/data/types";
import { duration, DAY, HOUR, toDate } from "@/lib/time";
import { plural } from "@/lib/format";
import { paths } from "@/routes";

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "40 min", "5 h", then "2 d" past two days: how long until something is due. */
export function shortSpan(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < HOUR) return `${m} min`;
  if (m < 48 * HOUR) return `${Math.round(m / HOUR)} h`;
  return `${Math.floor(m / DAY)} d`;
}

/** "Notice due in 5 h" for the next two days, then "Decision Thu". The same wording the Authorizations queue uses. */
export function dueText(verb: string, dueAt: number, clock: number): string {
  const left = dueAt - clock;
  if (left <= 0) return `${verb} now`;
  if (left < 48 * HOUR) return `${verb} in ${shortSpan(left)}`;
  return `${verb} ${WEEKDAY[toDate(dueAt).getDay()]}`;
}

/** "14 h" or "3 days": a span read inside a sentence. */
export function inSpan(min: number): string {
  const m = Math.max(1, Math.round(min));
  if (m < HOUR) return `${m} min`;
  if (m < 48 * HOUR) return `${Math.round(m / HOUR)} h`;
  return `${Math.round(m / DAY)} days`;
}

export const sentence = (t: string): string => (/[.!?]$/.test(t) ? t : `${t}.`);

/** "Review due in 3 h" reads inside a sentence as "review due in 3 h", but a verb such as "P2P" keeps its capitals. */
export const inline = (t: string): string => (/^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t);

export const shortPayer = (r: Pick<PsyRequest, "payerId">): string => payerById(r.payerId).shortName;

/* ------------------------------------------------------------------ due times */

/** A request on the Dashboard with the time something is due on it. */
export interface DueItem {
  request: PsyRequest;
  dueAt: number;
  verb: string;
}

/** What a denial's clock is for, in the words of a due time. */
const DENIAL_VERB: Record<string, string> = { "peer-to-peer window": "P2P window closes", "to resubmit": "Resubmit", "to file": "File" };

/**
 * The due time of every request that has one. A request that is open in the Authorizations queue uses the queue's own time and verb,
 * so the Dashboard and Authorizations agree; a denial that is not in the queue uses its deadline.
 * A request that was sent or decided has left the queue, so it has no due time here either.
 */
export function dueByRequest(requests: PsyRequest[], queueItems: QueueItem[]): Map<string, DueItem> {
  const out = new Map<string, DueItem>();
  for (const i of openItems(queueItems, requests)) {
    const r = requests.find((x) => x.id === i.id) ?? requests.find((x) => x.caseId === i.id);
    if (r && !out.has(r.id)) out.set(r.id, { request: r, dueAt: i.dueAt, verb: i.dueVerb });
  }
  for (const r of requests) {
    if (r.deadlineAt !== undefined && !out.has(r.id)) out.set(r.id, { request: r, dueAt: r.deadlineAt, verb: DENIAL_VERB[r.clockSub ?? ""] ?? "Deadline" });
  }
  return out;
}

/** Requests that wait on a person, the one due first at the top. */
export function needsYouList(requests: PsyRequest[], dues: Map<string, DueItem>): PsyRequest[] {
  return requests
    .filter((r) => r.needsYou)
    .sort((a, b) => (dues.get(a.id)?.dueAt ?? Infinity) - (dues.get(b.id)?.dueAt ?? Infinity) || a.stageSince - b.stageSince);
}

/** Every request still open in the Authorizations queue, the one due first at the top. Two due at the same minute: the lower approval chance first. */
export function openByDue(queueItems: QueueItem[], requests: PsyRequest[]): QueueItem[] {
  return openItems(queueItems, requests).sort((a, b) => a.dueAt - b.dueAt || a.chance - b.chance);
}

/** "review due in 3 h" for one request: its due text if it has a due time, else how long it has waited. */
export function dueLine(r: PsyRequest, dues: Map<string, DueItem>, clock: number): string {
  const d = dues.get(r.id);
  return d ? inline(dueText(d.verb, d.dueAt, clock)) : `${r.chip.toLowerCase()} for ${duration(Math.max(0, clock - r.stageSince))}`;
}

/* ------------------------------------------------------------------ authorizations that end */

export interface Ending {
  c: LedgerCase;
  /** Minutes until the approval ends; zero or less once it has. */
  left: number;
}

/**
 * Approved cases on the Case Manager ledger whose approval ends inside `withinDays` days, soonest first, and the ones that already ended.
 * Only a case with an end date counts: one measured in units to the end of the stay (clock kind "units") has no date to run out on.
 */
export function endingAuthorizations(ledger: LedgerCase[], clock: number, withinDays = 7): { soon: Ending[]; ended: Ending[] } {
  const rows = ledger.filter((c) => c.clockKind === "expiry" && c.used !== null && c.total !== null).map((c): Ending => ({ c, left: c.dueAt - clock }));
  return {
    soon: rows.filter((e) => e.left > 0 && e.left < withinDays * DAY).sort((a, b) => a.left - b.left),
    ended: rows.filter((e) => e.left <= 0).sort((a, b) => b.left - a.left),
  };
}

/** "46 of 48 units", "12 of 14 days" */
export const usedOf = (c: LedgerCase): string => `${c.used ?? 0} of ${c.total ?? 0} ${c.unit}`;

/* ------------------------------------------------------------------ denial deadlines */

/** Open denials (the Appeal or call stage) with a deadline: the ones inside `withinDays` days, nearest first, and the ones whose window has closed. */
export function denialDeadlines(requests: PsyRequest[], clock: number, withinDays = 7): { soon: PsyRequest[]; closed: PsyRequest[] } {
  const open = requests.filter((r) => r.stage === "appeal" && r.deadlineAt !== undefined);
  const left = (r: PsyRequest): number => (r.deadlineAt ?? 0) - clock;
  return {
    soon: open.filter((r) => left(r) >= 0 && left(r) < withinDays * DAY).sort((a, b) => left(a) - left(b)),
    closed: open.filter((r) => left(r) < 0),
  };
}

/** "peer-to-peer window, 36 h left" */
export const deadlineLine = (r: PsyRequest, clock: number): string => `${r.clockSub ?? "deadline"}, ${inSpan((r.deadlineAt ?? clock) - clock)} left`;

/* ------------------------------------------------------------------ the Dashboard summary */

export interface SummaryLine {
  id: "needs" | "expiry" | "denials";
  text: string;
  link: { label: string; to: string };
}

export interface SummaryInput {
  requests: PsyRequest[];
  queueItems: QueueItem[];
  ledger: LedgerCase[];
  clock: number;
}

/** Three short lines: who needs you and what is due soonest, which authorizations end this week, which denial deadlines fall this week. */
export function summaryLines({ requests, queueItems, ledger, clock }: SummaryInput): SummaryLine[] {
  const dues = dueByRequest(requests, queueItems);
  const needs = needsYouList(requests, dues);
  const soonest = openByDue(queueItems, requests)[0];

  const first = needs[0];
  const soonText = soonest && soonest.id !== first?.id && soonest.id !== first?.caseId ? ` Due soonest: ${soonest.id} (${payerById(soonest.payerId).shortName}), ${inline(dueText(soonest.dueVerb, soonest.dueAt, clock))}.` : "";
  const who = first
    ? `${plural(needs.length, "request")} ${needs.length === 1 ? "needs" : "need"} you. Most urgent: ${first.id} (${shortPayer(first)}), ${dueLine(first, dues, clock)}.${soonText}`
    : `Nothing needs you right now.${soonText}`;
  const whoTo = first?.id ?? soonest?.id;

  const { soon, ended } = endingAuthorizations(ledger, clock);
  const endedText = ended.length ? ` ${plural(ended.length, "authorization")} ${ended.length === 1 ? "has" : "have"} already ended.` : "";
  const ending = soon.length
    ? `${soon[0].c.id} has used ${usedOf(soon[0].c)} and ends in ${inSpan(soon[0].left)}.${soon.length > 1 ? ` ${soon.length - 1} more end within 7 days.` : ""}${endedText}`
    : `No authorization ends in the next 7 days.${endedText}`;

  const { soon: dl, closed } = denialDeadlines(requests, clock);
  const closedText = closed.length ? ` ${plural(closed.length, "window")} ${closed.length === 1 ? "has" : "have"} already closed.` : "";
  const denials = dl.length
    ? `${plural(dl.length, "denial deadline")} ${dl.length === 1 ? "falls" : "fall"} this week. Nearest: ${dl[0].id} (${shortPayer(dl[0])}), ${deadlineLine(dl[0], clock)}.${closedText}`
    : `No denial deadline falls this week.${closedText}`;

  return [
    { id: "needs", text: who, link: whoTo ? { label: `Open ${whoTo}`, to: paths.case(whoTo) } : { label: "Open Authorizations", to: paths.authorizations() } },
    { id: "expiry", text: ending, link: { label: "Open Case Manager", to: paths.manager("cases") } },
    { id: "denials", text: denials, link: { label: "Open Denial Intelligence", to: paths.denials(dl[0]?.id) } },
  ];
}
