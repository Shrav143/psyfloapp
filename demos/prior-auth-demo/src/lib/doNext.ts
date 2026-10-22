/* What a person should do about each request, and the short list of things to do now. The Dashboard's Next action and Owner columns, its Do next card
   and the Ask FLO answer to "What needs me today?" all read this, so they never disagree. Worked out from the data it is given each time,
   so it moves with the demo clock and with every request. A recommendation for a person to check, never a payer fact. */
import { AGENTS } from "@/data/agents";
import type { LedgerCase } from "@/data/manager";
import type { QueueItem } from "@/data/queue";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL, type PsyRequest } from "@/data/types";
import { endingAuthorizations, dueByRequest, dueText, inSpan, inline, sentAt, usedOf, type DueItem } from "@/lib/floFacts";
import { endsSoon, isRenewalDue, ledgerFor } from "@/lib/ledgerFacts";
import { plural } from "@/lib/format";
import { DAY, HOUR, duration, typical } from "@/lib/time";
import { lateness, minutesInStage } from "@/store/selectors";

/* ------------------------------------------------------------------ the CMS decision time */

/** CMS prior authorization rule from 2026: a Medicaid managed care payer decides a standard request within 7 calendar days (72 hours if expedited). State rules may differ. */
export const CMS_DAYS = 7;
export const CMS_NOTE = "CMS rule for Medicaid managed care: decide within 7 calendar days (72 hours if expedited). Check your state.";

export interface CmsClock {
  /** Days since the request went to the payer. */
  days: number;
  /** The calendar day it is on: 1 on the day it was sent. */
  day: number;
  past: boolean;
  /** From day 5 until it is past: "Day 5 of 7". */
  hint: boolean;
}

/** Only a Medicaid managed care payer, and only while the payer holds the decision (Received or Under review). */
export function cmsClock(r: PsyRequest, clock: number): CmsClock | undefined {
  if (r.stage !== "received" && r.stage !== "under_review") return undefined;
  if (payerById(r.payerId)?.group !== "Ohio Medicaid") return undefined;
  const days = Math.max(0, clock - (sentAt(r) ?? r.stageSince)) / DAY;
  const day = Math.floor(days) + 1;
  return { days, day, past: days >= CMS_DAYS, hint: day >= 5 && days < CMS_DAYS };
}

/* ------------------------------------------------------------------ one request: next action and owner */

export type ActionKind = "sign" | "answer" | "send" | "chase" | "p2p" | "write-back" | "renewal" | "wait" | "none";
export interface Owner {
  kind: "you" | "agent" | "payer";
  name: string;
}
export interface RequestAction {
  kind: ActionKind;
  /** A verb phrase: "Review and sign", "Answer Scribe", "Chase the payer", "Prepare the P2P call", "Start renewal", "Wait for the decision". */
  verb: string;
  owner: Owner;
  /** A person should do it today: waiting on them now, or a denial deadline inside two days. */
  today: boolean;
}

export interface FactsContext {
  clock: number;
  /** EMR Connect's write-back switch: an approval waits for a person to confirm only while it is on. */
  writeBackOn: boolean;
  /** Preparing requests whose draft passed every check (readyToSignIds). */
  ready: ReadonlySet<string>;
  dues: Map<string, DueItem>;
  ledger: readonly LedgerCase[];
}

const YOU: Owner = { kind: "you", name: "You" };
const agentOwner = (r: PsyRequest): Owner => ({ kind: "agent", name: AGENTS[r.agent].name });
const payerOwner = (r: PsyRequest): Owner => ({ kind: "payer", name: payerById(r.payerId).shortName });

export function requestAction(r: PsyRequest, ctx: FactsContext): RequestAction {
  const { clock } = ctx;
  const agent = AGENTS[r.agent].name;
  const make = (kind: ActionKind, verb: string, owner: Owner, today = false): RequestAction => ({ kind, verb, owner, today });
  switch (r.stage) {
    case "preparing":
      if (ctx.ready.has(r.id)) return make("sign", "Review and sign", YOU, true);
      if (r.needsYou) return make("answer", `Answer ${agent}`, YOU, true);
      return make("wait", `Wait for ${agent}`, agentOwner(r));
    case "info_requested":
      return r.needsYou ? make("send", "Review and send", YOU, true) : make("wait", `Wait for ${agent}`, agentOwner(r));
    case "received":
    case "under_review": {
      const cms = cmsClock(r, clock);
      // A request a few minutes past its typical time is not worth a call: late means late by at least four hours, or past day 4 of the CMS clock.
      if ((lateness(r, clock) !== "ok" && minutesInStage(r, clock) >= 4 * HOUR) || cms?.hint || cms?.past) return r.agent === "caller" ? make("chase", "Chase the payer", agentOwner(r)) : make("chase", "Chase the payer", YOU, true);
      return make("wait", "Wait for the decision", payerOwner(r));
    }
    case "decided": {
      if (r.outcome === "approved" && ctx.writeBackOn && r.next.includes("Write-back waits")) return make("write-back", "Approve write-back", YOU, true);
      const c = ledgerFor(ctx.ledger, r);
      if (c && isRenewalDue(c, clock)) return make("renewal", "Start renewal", YOU, endsSoon(c, clock, 2));
      return make("none", "No action needed", { kind: "agent", name: AGENTS.cadence.name });
    }
    case "appeal": {
      if (r.type === "Peer-to-peer") return make("p2p", "Prepare the P2P call", YOU, (ctx.dues.get(r.id)?.dueAt ?? Infinity) - clock <= 2 * DAY);
      if (r.agent === "navigator") return make("wait", "Wait for the decision", payerOwner(r));
      return make("wait", `Wait for ${agent}`, agentOwner(r));
    }
  }
}

/* ------------------------------------------------------------------ the Do next list */

export type DoGo =
  | { to: "draft"; requestId: string }
  | { to: "request"; requestId: string }
  | { to: "denial"; id: string }
  | { to: "renew"; caseId: string }
  | { to: "saved" };

export interface DoItem {
  key: string;
  kind: ActionKind;
  caseId: string;
  /** One plain sentence: "Review and sign R-0988". */
  sentence: string;
  /** Who and what, in quiet type, then when. `urgent` marks a time inside 24 hours or already past. */
  who: string;
  when?: string;
  urgent: boolean;
  /** The one action: its label and where it goes. */
  button: string;
  go: DoGo;
}

export interface DoNextInput {
  requests: PsyRequest[];
  queueItems: QueueItem[];
  ledger: LedgerCase[];
  clock: number;
  writeBackOn: boolean;
  ready: ReadonlySet<string>;
  /** Cases saved in New case that have no row yet and wait for a person. */
  savedNeedingYou: number;
}

/** Hard deadlines come first. A late payer, a write-back and a renewal can wait a little longer, unless the CMS time has passed. */
/** Terracotta: a time inside six hours, or already past. */
export const URGENT = 6 * HOUR;
const SOFT = { chase: 48 * 60, renewal: 24 * 60, writeBack: 72 * 60, saved: 12 * 60 };
const ORDER: ActionKind[] = ["sign", "send", "answer", "p2p", "chase", "write-back", "renewal", "wait", "none"];

const who = (r: PsyRequest): string => `${r.patient.initials}, ${r.patient.age} · ${payerById(r.payerId).shortName} · ${PROGRAM_LABEL[r.program]}`;

/**
 * The few things to do now, the most pressing first: a request ready to sign, a question from an agent or a payer, a denial deadline,
 * a payer that is late or past the CMS time, an approval to write back, an authorization that ends. Computed only from what it is given, so a viewer
 * limited to one site gets a list that names no case at the other.
 */
export function doNext(input: DoNextInput, limit = 5): { items: DoItem[]; total: number } {
  const { requests, queueItems, ledger, clock } = input;
  const dues = dueByRequest(requests, queueItems);
  const ctx: FactsContext = { clock, writeBackOn: input.writeBackOn, ready: input.ready, dues, ledger };
  const out: (DoItem & { rank: number })[] = [];
  const add = (item: DoItem, rank: number) => out.push({ ...item, rank });
  const timeLeft = (d: DueItem | undefined): number | undefined => (d ? d.dueAt - clock : undefined);

  for (const r of requests) {
    const a = requestAction(r, ctx);
    const due = dues.get(r.id);
    const left = timeLeft(due);
    const base = { key: r.id, kind: a.kind, caseId: r.caseId, who: who(r), when: due ? dueText(due.verb, due.dueAt, clock) : undefined, urgent: left !== undefined && left <= URGENT };
    const agent = AGENTS[r.agent].name;
    if (a.kind === "sign") add({ ...base, sentence: `Review and sign ${r.id}`, button: "Review and sign", go: { to: "draft", requestId: r.id } }, left ?? DAY);
    else if (a.kind === "answer") add({ ...base, sentence: `Answer ${agent}'s question on ${r.id}`, button: `Answer ${agent}`, go: { to: "draft", requestId: r.id } }, left ?? DAY);
    else if (a.kind === "send") add({ ...base, sentence: `Review ${agent}'s answer to ${payerById(r.payerId).shortName} on ${r.id}`, button: "Review answer", go: { to: "request", requestId: r.id } }, left ?? DAY);
    else if (a.kind === "p2p" && left !== undefined && left <= 7 * DAY) {
      const when = left <= 0 ? "the window has closed" : `peer-to-peer in ${inSpan(left)}`;
      add({ ...base, sentence: `Open denial ${r.id}, ${when}`, when: r.next.replace(/\.$/, ""), button: "Open denial", go: { to: "denial", id: r.id } }, left);
    } else if (a.kind === "chase" && a.owner.kind === "you") {
      const cms = cmsClock(r, clock);
      const spent = `${duration(Math.max(0, clock - r.stageSince))} in review${r.typicalMin ? `, median ${typical(r.typicalMin)}` : ""}`;
      const day = cms && (cms.hint || cms.past) ? (cms.past ? " · past 7 days" : ` · day ${cms.day} of ${CMS_DAYS}`) : "";
      add({ ...base, sentence: `Chase ${payerById(r.payerId).shortName} on ${r.id}`, when: `${spent}${day}`, urgent: !!cms?.past, button: "Open request", go: { to: "request", requestId: r.id } }, cms?.past ? -1e9 : (left ?? 0) + SOFT.chase);
    } else if (a.kind === "write-back") add({ ...base, sentence: `Approve the write-back for ${r.id}`, when: "Approved today", urgent: false, button: "Approve write-back", go: { to: "request", requestId: r.id } }, SOFT.writeBack);
  }

  // An authorization that ends soon, or already has, and has no request in flight to replace it.
  const inFlight = new Set(requests.filter((r) => r.stage !== "decided" && r.stage !== "appeal").flatMap((r) => [r.id, r.caseId]));
  const { soon, ended } = endingAuthorizations(ledger, clock);
  for (const e of [...ended, ...soon]) {
    if (inFlight.has(e.c.id) || inFlight.has(e.c.caseId)) continue;
    const when = e.left <= 0 ? `The approval ended ${inSpan(-e.left)} ago` : `The approval ends in ${inSpan(e.left)}`;
    add({ key: `renew-${e.c.id}`, kind: "renewal", caseId: e.c.caseId, sentence: `Start renewal for ${e.c.id}`, who: `${e.c.initials}, ${e.c.age} · ${payerById(e.c.payerId).shortName} · ${PROGRAM_LABEL[e.c.program]}`, when: `${usedOf(e.c)} used. ${when}`, urgent: e.left <= URGENT, button: "Start renewal", go: { to: "renew", caseId: e.c.caseId } }, Math.max(0, e.left) + SOFT.renewal);
  }

  if (input.savedNeedingYou > 0) {
    add({ key: "saved", kind: "answer", caseId: "", sentence: `Finish ${plural(input.savedNeedingYou, "case")} saved in New case`, who: "Waiting for a question or a signature", urgent: false, button: "Open Active cases", go: { to: "saved" } }, SOFT.saved);
  }

  out.sort((a, b) => a.rank - b.rank || ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
  return { items: out.slice(0, limit).map(({ rank: _rank, ...item }) => item), total: out.length };
}

/** "Review and sign R-0988 (Beacon), review due in 3 h" for the one-line answers. */
export const doLine = (i: DoItem): string => `${i.sentence}${i.when ? `, ${inline(i.when)}` : ""}`;
