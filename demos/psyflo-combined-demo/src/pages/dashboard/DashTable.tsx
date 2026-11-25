import { BedDouble, Building2, CircleAlert, CircleCheck, CircleDashed, Clock, Droplets, FileText, History, Hourglass, Layers, LogIn, MessageCircleQuestion, PenLine, Phone, PhoneCall, RefreshCw, Scale, Send, SearchX, Timer, Users, UserRound, type LucideIcon } from "lucide-react";
import { Fragment } from "react";
import { Button, EmptyState } from "@/components/ui";
import type { Program } from "@/data/types";
import { PROGRAM_LABEL } from "@/data/types";
import { cn } from "@/lib/cn";
import type { ActionKind } from "@/lib/doNext";
import { URGENT } from "@/lib/doNext";
import { windowText } from "@/lib/ledgerFacts";
import { DAY, duration } from "@/lib/time";
import type { CaseRow } from "./caseRows";
import { payerRowLabel } from "./helpers";
import { leftOf, type Tier } from "./model";

export const PAGE_SIZE = 12;

const TIER: Record<Tier, { icon: LucideIcon; text: string; chip: string; band: string; word: string }> = {
  attention: { icon: CircleAlert, text: "text-risk-ink", chip: "bg-risk-bg text-risk-ink", band: "bg-risk-bg/60", word: "Needs attention" },
  upcoming: { icon: Clock, text: "text-mid-ink", chip: "bg-mid-bg text-mid-ink", band: "bg-mid-bg/60", word: "Upcoming" },
  waiting: { icon: Send, text: "text-neutral-ink", chip: "bg-neutral-bg text-neutral-ink", band: "bg-tile", word: "With the payer or the agents" },
  done: { icon: CircleCheck, text: "text-good-ink", chip: "bg-good-bg text-good-ink", band: "bg-good-bg/50", word: "Decided" },
};

const PROGRAM_ICON: Record<Program, LucideIcon> = { RES: BedDouble, PHP: Building2, IOP: Users, WM: Droplets };
const PROGRAM_SHORT: Record<Program, string> = { RES: "RES", PHP: "PHP", IOP: "IOP", WM: "DETOX" };

/** One icon for the kind of request; the full name is the tooltip. */
function typeIcon(type: string): LucideIcon {
  const t = type.toLowerCase();
  if (t.includes("peer")) return Phone;
  if (t.includes("appeal") || t.includes("resubmi")) return Scale;
  if (t.includes("retro")) return History;
  if (t.includes("continued") || t.includes("recert") || t.includes("reauth") || t.includes("concurrent") || t.includes("extension") || t.includes("modif")) return RefreshCw;
  return LogIn;
}

const ACTION_ICON: Record<ActionKind, LucideIcon> = { sign: PenLine, answer: MessageCircleQuestion, send: Send, chase: PhoneCall, p2p: Phone, "write-back": CircleCheck, renewal: RefreshCw, wait: CircleDashed, none: CircleDashed };

/** "5 h", "1 d 4 h", "35 m" — the same compact time the platform uses everywhere. */
const span = (min: number): string => (min <= 0 ? "now" : duration(min));

function Time({ row, tier, clock }: { row: CaseRow; tier: Tier; clock: number }) {
  const left = leftOf(row, clock);
  if (tier === "done") return <span className="text-faint">—</span>;
  if (left !== undefined) {
    const tone = left <= URGENT ? "text-risk-ink" : left <= 2 * DAY ? "text-mid-ink" : "text-muted";
    return <span className={cn("inline-flex items-center gap-1 font-medium tabular-nums", tone)} title={`${row.due?.verb ?? "Due"} ${left <= 0 ? "now" : `in ${span(left)}`}`}><Timer size={14} className="ico" aria-hidden="true" />{span(left)}</span>;
  }
  const tone = row.late === "very" ? "text-risk-ink" : row.late === "late" ? "text-mid-ink" : "text-muted";
  return <span className={cn("inline-flex items-center gap-1 tabular-nums", tone)} title={`${row.status} for ${span(row.minutes)}`}><Clock size={14} className="ico" aria-hidden="true" />{span(row.minutes)}</span>;
}

function Units({ row, clock }: { row: CaseRow; clock: number }) {
  if (!row.units) return <span className="text-faint" aria-label="none">—</span>;
  const { total, left, unit } = row.units;
  const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((left / total) * 100))) : 0;
  const ending = row.window ? row.window.to - clock <= 7 * DAY : false;
  return (
    <span className="inline-flex items-center gap-2" title={`${left} of ${total} ${unit} left${row.window ? `, ${windowText(row.window)}` : ""}`}>
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-neutral-bg"><i className={cn("block h-full rounded-full", pct <= 20 ? "bg-risk" : pct <= 40 ? "bg-mid" : "bg-forest")} style={{ width: `${pct}%` }} /></span>
      <span className="text-[12px] tabular-nums text-ink2">{left}/{total}</span>
      {ending ? <Hourglass size={14} className="ico text-mid-ink" aria-label="Ends within 7 days" /> : null}
    </span>
  );
}

function Row({ row, tier, clock, onOpen }: { row: CaseRow; tier: Tier; clock: number; onOpen: (id: string) => void }) {
  const r = row.r;
  const T = TIER[tier];
  const TIcon = T.icon;
  const Prog = PROGRAM_ICON[r.program];
  const Type = typeIcon(r.type);
  const Act = ACTION_ICON[row.action.kind];
  const mine = row.action.owner.kind === "you";
  const quiet = row.action.kind === "wait" || row.action.kind === "none";
  return (
    <tr data-request={r.id} data-tier={tier} onClick={(e) => !(e.target as Element).closest("button, a") && onOpen(r.id)} className="cursor-pointer border-t border-line hover:bg-tile">
      <td className="py-2.5 pr-1 pl-5"><span className={cn("grid h-8 w-8 place-items-center rounded-full", T.chip)} title={T.word}><TIcon size={17} className="ico" aria-label={T.word} /></span></td>
      <td className="px-2 py-2.5">
        <button type="button" onClick={() => onOpen(r.id)} className="text-left font-semibold hover:text-forest hover:underline">{r.patient.initials}, {r.patient.age}</button>
        <div className="text-[12px] text-muted">{r.id}</div>
      </td>
      <td className="px-2 py-2.5 text-[13px] text-ink2">{payerRowLabel(r.payerId)}</td>
      <td className="px-2 py-2.5"><span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink2" title={PROGRAM_LABEL[r.program]}><Prog size={15} className="ico text-muted" aria-hidden="true" />{PROGRAM_SHORT[r.program]}</span></td>
      <td className="px-2 py-2.5"><span title={r.type} className="inline-grid h-7 w-7 place-items-center rounded-lg bg-tile text-ink2"><Type size={15} className="ico" aria-label={r.type} /></span></td>
      <td className="px-2 py-2.5 text-[13px]"><Time row={row} tier={tier} clock={clock} /></td>
      <td className="px-2 py-2.5"><Units row={row} clock={clock} /></td>
      <td className="py-2.5 pr-5 pl-2 text-right">
        <button
          type="button" onClick={() => onOpen(r.id)} data-action={row.action.kind} title={`${row.action.verb}${mine ? " (you)" : ` · ${row.action.owner.name}`}`} aria-label={`${row.action.verb} for ${r.patient.initials}`}
          className={cn("relative inline-grid h-9 w-9 place-items-center rounded-full border transition-colors", quiet ? "border-edge bg-white text-faint hover:bg-tile" : tier === "attention" ? "border-risk bg-risk text-white hover:opacity-90" : tier === "upcoming" ? "border-mid-edge bg-mid-bg text-mid-ink hover:bg-white" : "border-forest bg-forest text-white hover:bg-forest-dark")}
        >
          <Act size={17} className="ico" aria-hidden="true" />
          {mine && !quiet ? <UserRound size={11} className="ico absolute -top-1 -right-1 rounded-full bg-marigold p-[1px] text-navy" aria-label="Waiting on you" /> : null}
        </button>
      </td>
    </tr>
  );
}

const HEAD: { icon: LucideIcon; label: string; cls?: string }[] = [
  { icon: CircleAlert, label: "Status", cls: "pl-5" },
  { icon: UserRound, label: "Patient" },
  { icon: Building2, label: "Payer" },
  { icon: Layers, label: "Program" },
  { icon: FileText, label: "Request type" },
  { icon: Timer, label: "Time" },
  { icon: Hourglass, label: "Units left" },
  { icon: PenLine, label: "Next step", cls: "pr-5 text-right" },
];

interface Props {
  groups: { tier: Tier; rows: CaseRow[] }[];
  visible: number;
  clock: number;
  onOpen: (id: string) => void;
  onMore: () => void;
  onClear: () => void;
  narrowed: boolean;
}

/** One table, grouped by colour: what needs you now first (this is where the old Do next list went), then what is coming up, then everything else.
    Icons carry the meaning; the rows have almost no text. A tooltip names every icon. */
export function DashTable({ groups, visible, clock, onOpen, onMore, onClear, narrowed }: Props) {
  const total = groups.reduce((n, g) => n + g.rows.length, 0);
  let budget = visible;
  return (
    <section aria-label="Authorizations" id="authorizations-table" className="overflow-hidden rounded-[20px] border border-edge bg-white" data-testid="dash-table">
      {total === 0 ? (
        <EmptyState icon={SearchX} title="Nothing here" action={narrowed ? <Button onClick={onClear}>Clear filters</Button> : undefined}>No authorization matches these filters.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-[14px]">
            <thead>
              <tr className="text-muted">
                {HEAD.map((h) => (
                  <th key={h.label} scope="col" className={cn("px-2 py-2.5 text-left font-normal", h.cls)} title={h.label}>
                    <h.icon size={15} className="ico" aria-hidden="true" /><span className="sr-only">{h.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => {
                if (g.rows.length === 0 || budget <= 0) return null;
                const shown = g.rows.slice(0, budget);
                budget -= shown.length;
                const T = TIER[g.tier];
                const Icon = T.icon;
                return (
                  <Fragment key={g.tier}>
                    <tr data-group={g.tier} className={cn("border-t border-edge", T.band)}>
                      <th colSpan={HEAD.length} scope="colgroup" className={cn("px-5 py-2 text-left text-[13px] font-semibold", T.text)}>
                        <span className="inline-flex items-center gap-2"><Icon size={16} className="ico" aria-hidden="true" />{T.word}<span className="rounded-full bg-white/80 px-2 text-[12px] tabular-nums">{g.rows.length}</span></span>
                      </th>
                    </tr>
                    {shown.map((row) => <Row key={row.r.id} row={row} tier={g.tier} clock={clock} onOpen={onOpen} />)}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {total > visible ? (
        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
          <span className="text-[13px] text-muted" aria-live="polite">{Math.min(visible, total)} / {total}</span>
          <Button onClick={onMore}>Show more</Button>
        </div>
      ) : null}
    </section>
  );
}
