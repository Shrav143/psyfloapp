import { APPEAL_LEVELS, levelOf, type DenialMeta, type DenialWork } from "@/data/denials";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL, type AgentKey, type PayerId, type PsyRequest, type Tone } from "@/data/types";
import { DAY, shortDate } from "@/lib/time";
import { buildAnalysis, resolveMeta } from "./analysis";
import { isClosed, isFiled, leftLabel } from "./format";
import { recommendedStep } from "./step";

/* The dashboard of open denials: one row per denial, the figures above the table, the filters and the sort. Pure, so the counts and the rows always agree. */

/** Where an open denial stands. "decide" has no route under way yet. */
export type DenialStatus = "decide" | "call" | "drafting" | "payer";

/** The figures above the table. Each one is also the filter it names; "closed" switches the table to settled denials. */
export type FigureId = "open" | "week" | "decide" | "call" | "appeal" | "closed";
export const FIGURE_LABEL: Record<FigureId, string> = { open: "Open", week: "Deadlines this week", decide: "To decide", call: "Peer-to-peer booked", appeal: "Appeals in progress", closed: "Closed" };
export const FIGURES: FigureId[] = ["open", "week", "decide", "call", "appeal", "closed"];
export const isFigure = (v: string | null): v is FigureId => !!v && (FIGURES as string[]).includes(v);

export type SortKey = "id" | "patient" | "payer" | "program" | "denied" | "chance" | "next" | "deadline" | "owner";

export interface DenialRow {
  id: string;
  req: PsyRequest;
  who: string;
  payerId: PayerId;
  payer: string;
  program: string;
  /** What the payer did not approve: "7 of 14 days", "48 to 30 units". */
  denied: string;
  chance?: number;
  status: DenialStatus;
  next: { text: string; when?: string };
  /** Time left on our own clock; none once the appeal is with the payer. */
  deadline?: { left: number; text: string; tone: Tone; what: string };
  owner: AgentKey;
  /** Added from a letter and no route chosen yet: listed first until someone picks one. */
  fresh: boolean;
  /** A settled denial: how it ended and when. */
  closed?: { text: string; at: number; tone: Tone };
}

/** "7 of 14 days", "48 to 30 units", or the kind of denial when it is not a count. */
export function deniedText(m: DenialMeta): string {
  if (m.daysApproved !== undefined && m.daysRequested !== undefined) return `${m.daysApproved} of ${m.daysRequested} days`;
  if (m.unitsApproved !== undefined && m.unitsRequested !== undefined) return `${m.unitsRequested} to ${m.unitsApproved} units`;
  if (m.type === "Level-of-care downgrade") return "Lower level of care";
  if (m.type === "Retro-authorization denied") return "Retro-auth";
  if (m.type === "Full denial") return "Full request";
  return m.type;
}

export function statusOf(r: PsyRequest): DenialStatus {
  if (isFiled(r)) return "payer";
  if (r.chip === "Call booked") return "call";
  if (r.chip === "Appeal drafting") return "drafting";
  return "decide";
}

const WINDOW_WORD: Record<string, string> = { "peer-to-peer window": "call window", "to file": "to file", "to resubmit": "to resubmit" };

function deadlineOf(r: PsyRequest, clock: number): DenialRow["deadline"] {
  if (r.deadlineAt === undefined || isFiled(r)) return undefined;
  const left = r.deadlineAt - clock;
  return { left, text: left > 0 ? leftLabel(left) : "Passed", tone: left < 2 * DAY ? "risk" : left < 7 * DAY ? "mid" : "neutral", what: WINDOW_WORD[r.clockSub ?? ""] ?? "deadline" };
}

function nextOf(r: PsyRequest, meta: DenialMeta, work: DenialWork | undefined, clock: number): DenialRow["next"] {
  const status = statusOf(r);
  if (status === "payer") return { text: r.chip === "External review" ? "Reviewer's decision" : "Payer's decision", when: r.clockNote?.replace(/^decision /, "expected ") };
  if (status === "call") return { text: "Peer-to-peer call", when: work?.slot?.label ?? meta.bookedWindow ?? r.clockNote?.replace(/^call /, "") };
  if (status === "drafting") {
    const name = APPEAL_LEVELS[levelOf(r.chip, work)].name;
    return { text: work?.appealDraft ? `Sign and file the ${name.toLowerCase()}` : `${name} letter, drafting`, when: r.deadlineAt !== undefined ? `due ${shortDate(r.deadlineAt)}` : undefined };
  }
  const a = buildAnalysis(r, meta, clock);
  return { text: recommendedStep(r, meta, a, clock).word };
}

function closedOf(work: DenialWork | undefined): DenialRow["closed"] {
  if (work?.accepted) return { text: "Accepted", at: work.accepted.at, tone: "neutral" };
  if (work?.decision && work.decision.result !== "upheld") return { text: work.decision.result === "overturned" ? "Overturned on appeal" : "Partly overturned on appeal", at: work.decision.at, tone: work.decision.result === "overturned" ? "good" : "mid" };
  if (work?.outcome && work.outcome.kind !== "upheld") return { text: work.outcome.kind === "overturned" ? "Overturned on the call" : "Partly restored on the call", at: work.outcome.at, tone: "good" };
  return undefined;
}

export function rowOf(r: PsyRequest, stored: DenialMeta | undefined, work: DenialWork | undefined, clock: number): DenialRow {
  const meta = resolveMeta(r, stored);
  const settled = isClosed(work);
  return {
    id: r.id,
    req: r,
    who: `${r.patient.initials}, ${r.patient.age}`,
    payerId: r.payerId,
    payer: payerById(r.payerId).shortName,
    program: PROGRAM_LABEL[r.program],
    denied: deniedText(meta),
    chance: r.chance,
    status: statusOf(r),
    next: settled ? { text: "" } : nextOf(r, meta, work, clock),
    deadline: settled ? undefined : deadlineOf(r, clock),
    owner: r.agent,
    fresh: !!meta.letterName && r.chip === "Analyzed",
    closed: settled ? closedOf(work) : undefined,
  };
}

const WEEK = 7 * DAY;
/** Whether a row belongs under a figure. */
export function inFigure(row: DenialRow, view: FigureId): boolean {
  if (view === "closed") return !!row.closed;
  if (row.closed) return false;
  if (view === "week") return !!row.deadline && row.deadline.left <= WEEK;
  if (view === "decide") return row.status === "decide";
  if (view === "call") return row.status === "call";
  if (view === "appeal") return row.status === "drafting" || row.status === "payer";
  return true;
}

export const countFor = (rows: DenialRow[], view: FigureId): number => rows.filter((r) => inFigure(r, view)).length;

const NUM = (n: string): number => Number(/\d+/.exec(n)?.[0] ?? 0);
const KEY: Record<SortKey, (r: DenialRow) => number | string> = {
  id: (r) => NUM(r.id),
  patient: (r) => r.who,
  payer: (r) => r.payer,
  program: (r) => r.program,
  denied: (r) => r.denied,
  chance: (r) => r.chance ?? -1,
  next: (r) => r.next.text,
  // A denial with nothing on our clock (with the payer) sorts after every one that has a deadline.
  deadline: (r) => r.closed?.at ?? r.deadline?.left ?? Number.POSITIVE_INFINITY,
  owner: (r) => r.owner,
};

/** The table order. The default (deadline, soonest first) puts newly added letters on top, so a person sees what they just added. */
export function sortRows(rows: DenialRow[], key: SortKey, dir: 1 | -1, isDefault: boolean): DenialRow[] {
  const by = KEY[key];
  return [...rows].sort((a, b) => {
    if (isDefault && a.fresh !== b.fresh) return a.fresh ? -1 : 1;
    if (isDefault && a.fresh && b.fresh) return b.req.stageSince - a.req.stageSince;
    const x = by(a);
    const y = by(b);
    const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
    return c * dir || a.id.localeCompare(b.id);
  });
}
