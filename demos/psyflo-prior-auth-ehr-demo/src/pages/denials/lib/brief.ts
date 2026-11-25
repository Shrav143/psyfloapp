import type { DenialMeta } from "@/data/denials";
import { APPEAL_WINDOW_DAYS, type CallSlot } from "@/data/denials";
import { payerById } from "@/data/seed";
import type { PayerId, PsyRequest } from "@/data/types";
import { DAY, shortDate, stamp } from "@/lib/time";
import type { DenialAnalysis } from "./analysis";
import { REVIEW_NOTE, leftLabel } from "./format";

const LINES: Record<PayerId, { phone: string; reviewer: string }> = {
  summit: { phone: "(800) 555-0114", reviewer: "Physician reviewer, behavioral health" },
  cardinal: { phone: "(800) 555-0142", reviewer: "Physician, psychiatry" },
  evergreen: { phone: "(800) 555-0177", reviewer: "Physician reviewer, addiction medicine" },
  beacon: { phone: "(800) 555-0163", reviewer: "Physician reviewer, behavioral health" },
  harborview: { phone: "(800) 555-0128", reviewer: "Medical director, behavioral health" },
  lakeshore: { phone: "(800) 555-0191", reviewer: "Psychiatrist reviewer" },
};

export interface BriefData {
  payerName: string;
  reviewer: string;
  line: string;
  window: string;
  closesIn: string;
  closesTone: "risk" | "mid" | "neutral";
  dates: [string, string][];
  numbers: [string, string][];
  docs: string[];
}

export function buildBrief(r: PsyRequest, m: DenialMeta, a: DenialAnalysis, slot: CallSlot | undefined, clock: number, extraDocs: string[]): BriefData {
  const payer = payerById(r.payerId);
  const l = LINES[r.payerId];
  const left = r.deadlineAt === undefined ? undefined : r.deadlineAt - clock;
  const p2p = a.options[0].chance;
  const appeal = a.options[1].chance;
  const dates: [string, string][] = [["Denial received", stamp(r.stageSince)]];
  const window = slot?.label ?? m.bookedWindow;
  if (window) dates.push(["Call booked", window]);
  if (r.deadlineAt !== undefined && r.clockSub === "peer-to-peer window") dates.push(["Peer-to-peer window closes", stamp(r.deadlineAt)]);
  dates.push(["Written appeal due", shortDate(r.stageSince + APPEAL_WINDOW_DAYS * DAY)]);
  const numbers: [string, string][] = [];
  if (m.daysRequested !== undefined && m.daysApproved !== undefined) numbers.push(["Days requested and approved", `${m.daysRequested} and ${m.daysApproved}`]);
  if (m.unitsRequested !== undefined && m.unitsApproved !== undefined) numbers.push(["Units requested and approved", `${m.unitsRequested} and ${m.unitsApproved}`]);
  if (left !== undefined && r.clockSub === "peer-to-peer window") numbers.push(["Time left in the window", left <= 0 ? "Closed" : leftLabel(left)]);
  if (p2p) numbers.push(["Chance of overturning", `${p2p.value}% (likely ${p2p.low}–${p2p.high}%)`]);
  if (appeal) numbers.push(["Written appeal", `${appeal.value}% (likely ${appeal.low}–${appeal.high}%)`]);
  numbers.push(["Similar decisions", `${m.similar}${a.benchmark ? " (benchmark estimate)" : ""}`]);
  return {
    payerName: payer.name,
    reviewer: l.reviewer,
    line: `${payer.shortName} medical director line, ${l.phone}`,
    window: window ?? "Not booked yet",
    closesIn: left === undefined ? "No window set" : left <= 0 ? "Closed" : leftLabel(left),
    closesTone: left === undefined ? "neutral" : left < 2 * DAY ? "risk" : left < 7 * DAY ? "mid" : "neutral",
    dates,
    numbers,
    docs: [...a.findings.map((f) => f.source), ...extraDocs],
  };
}

/** The whole brief as plain text for Copy brief. */
export function briefToText(r: PsyRequest, a: DenialAnalysis, b: BriefData): string {
  const lines = [
    `Peer-to-peer brief · ${r.id}`,
    `${b.payerName} · ${a.ctx.program} · ${a.ctx.who}`,
    `Call: ${b.window}. Who to call: ${b.line}. Reviewer: ${b.reviewer}.`,
    REVIEW_NOTE,
    "",
    "YOUR OPENING",
    a.opening,
    "",
    "POINTS TO MAKE",
    ...a.points.map((p, i) => `${i + 1}. ${p.title}. ${p.detail} [${p.source}]`),
    "",
    "WHAT THEY MAY SAY",
    ...a.pushback.map(([q, ans]) => `${q}\n   ${ans}`),
    "",
    `THE ASK: ${a.ask}`,
    "",
    "KEY DATES",
    ...b.dates.map(([k, v]) => `${k}: ${v}`),
    "",
    "NUMBERS",
    ...b.numbers.map(([k, v]) => `${k}: ${v}`),
    "",
    `HAVE THESE OPEN: ${b.docs.join(", ")}`,
  ];
  return lines.join("\n");
}
