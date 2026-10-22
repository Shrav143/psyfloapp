import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Disclosure, Label, Table, Td, Th, Tr } from "@/components/ui";
import { PAYER_ORDER } from "@/data/analytics";
import { payerById } from "@/data/seed";
import { plural } from "@/lib/format";
import { paths } from "@/routes";
import type { Board } from "./board";
import { NOT_ENOUGH } from "./copy";
import { FloSection, WhatHelps } from "./FloSection";
import { LosSection, losSummary } from "./LosSection";
import { ProcessSection, processSummary, type Workload } from "./ProcessSection";
import type { CaseQuery } from "./query";
import { enough, fmt, pctOf } from "./stats";

interface ReasonLine {
  payerId: string;
  payer: string;
  reason: string;
  count: number;
  share: number;
}
/** One row per payer (its most common reason) when all payers are in view, or every reason of the one payer. Payers with fewer than 20 denials are left out. */
function reasonLines(board: Board): { rows: ReasonLine[]; total: number } | null {
  const denials = board.cur.filter((d) => d.outcome !== "approved" && d.reason);
  if (!enough(denials.length)) return null;
  const counts = new Map<string, ReasonLine>();
  for (const d of denials) {
    const k = `${d.payerId}|${d.reason}`;
    const hit = counts.get(k) ?? { payerId: d.payerId, payer: payerById(d.payerId).shortName, reason: d.reason as string, count: 0, share: 0 };
    hit.count += 1;
    counts.set(k, hit);
  }
  const all = [...counts.values()].map((r) => ({ ...r, share: pctOf(r.count, denials.length) ?? 0 }));
  const rows =
    board.filters.payer === "all"
      ? PAYER_ORDER.map((p) => ({ p, list: all.filter((r) => r.payerId === p) }))
          .filter((x) => enough(denials.filter((d) => d.payerId === x.p).length))
          .map((x) => x.list.sort((a, b) => b.count - a.count)[0])
      : all;
  return { rows: rows.sort((a, b) => b.count - a.count), total: denials.length };
}

function ReasonsTable({ board }: { board: Board }) {
  const navigate = useNavigate();
  const lines = reasonLines(board);
  const { s, period } = board;
  if (!lines) return <div className="px-6 py-10 text-center text-sm text-muted">{NOT_ENOUGH}. Figures based on fewer than 20 decisions stay hidden.</div>;
  const open = (payerId: string, reason: string) => navigate(paths.denials(undefined, { payer: payerId, reason }));
  const pct = (v: number | null): string => (v === null ? "-" : `${v}%`);
  return (
    <>
      <p className="px-6 pt-4 text-[13.5px] text-muted">
        {period.label}. {board.filters.payer === "all" ? "Each payer's most common reason." : "Every reason this payer gave."} Select a row to open those denials in Denial Intelligence.
      </p>
      <Table>
        <thead>
          <tr>
            <Th>Reason</Th>
            <Th>Payer</Th>
            <Th>Count</Th>
            <Th>Share of denials</Th>
          </tr>
        </thead>
        <tbody>
          {lines.rows.map((r) => (
            <Tr key={`${r.payerId}-${r.reason}`} onClick={() => open(r.payerId, r.reason)} data-reason={r.reason}>
              <Td>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    open(r.payerId, r.reason);
                  }}
                  className="text-left hover:underline"
                >
                  {r.reason}
                </button>
              </Td>
              <Td className="text-muted">{r.payer}</Td>
              <Td>{r.count}</Td>
              <Td>
                <div className="flex items-center gap-2.5">
                  <svg width="120" height="6" role="presentation" className="block">
                    <rect width="120" height="6" rx="3" fill="#F0ECE4" />
                    <rect width={Math.min(120, r.share * 3 * 1.2)} height="6" rx="3" fill="#B5553A" />
                  </svg>
                  <b className="text-risk-ink">{r.share}%</b>
                </div>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      <div className="grid grid-cols-1 gap-4 border-t border-line px-6 py-4 sm:grid-cols-2 sm:gap-6">
        <div>
          <Label>Appeals overturned</Label>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <b className="text-xl">{pct(enough(s.rulings) ? pctOf(s.overturned, s.rulings) : null)}</b>
            <span className="text-[13px] text-muted">{enough(s.rulings) ? `${fmt(s.overturned)} of ${fmt(s.rulings)} rulings ${period.phrase}` : NOT_ENOUGH}</span>
          </div>
        </div>
        <div>
          <Label>Denials accepted</Label>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <b className="text-xl" data-testid="accepted-count">
              {fmt(s.accepted)}
            </b>
            <span className="text-[13px] text-muted">
              {s.accepted === 1 ? "denial" : "denials"} {period.phrase}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

/** Everything behind the figures and charts, folded away. Each section opens in place and says in one line what is inside. */
export function Breakdowns({ board, workload, scopeWords, dismissed, onOpen }: { board: Board; workload: Workload; scopeWords: string; dismissed: { reason: string; count: number }[] | null; onOpen: (q: CaseQuery) => void }) {
  const phrase = board.period.phrase;
  const lines = useMemo(() => reasonLines(board), [board]);
  const top = lines?.rows[0];
  const helps = board.flo.helps[0];
  const f = board.flo;
  return (
    <section aria-labelledby="breakdowns-title" className="flex flex-col gap-3">
      <div className="px-1">
        <h2 id="breakdowns-title" className="font-serif text-[21px] font-semibold leading-tight tracking-tight">
          Detailed breakdowns
        </h2>
        <p className="mt-0.5 text-[13.5px] text-muted">The tables and rankings behind the figures above. Each one opens in place.</p>
      </div>
      <Disclosure title="Length of stay and units" summary={losSummary(board)} keepMounted={false}>
        <LosSection board={board} onOpen={onOpen} />
      </Disclosure>
      <Disclosure title="Process health" summary={processSummary(board)}>
        <ProcessSection board={board} workload={workload} scopeWords={scopeWords} onOpen={onOpen} />
      </Disclosure>
      <Disclosure title="Common denial reasons by payer" summary={top && lines ? `${fmt(lines.total)} denials ${phrase}. Most common: ${top.reason} at ${top.payer}, ${top.share}%.` : `${NOT_ENOUGH}.`}>
        <ReasonsTable board={board} />
      </Disclosure>
      <Disclosure
        title="How FLO's advice and drafts perform"
        summary={`${f.advice.pct === null ? `${NOT_ENOUGH}.` : `Advice taken works ${f.advice.pct}% of the time. ${f.noEdits === null ? "" : `${f.noEdits}% of drafts were sent without edits.`}`}${dismissed ? ` ${plural(dismissed.reduce((n, d) => n + d.count, 0), "recommendation")} dismissed.` : ""}`.trim()}
      >
        <FloSection board={board} dismissed={dismissed} />
      </Disclosure>
      <Disclosure title="What helps most" summary={helps ? `Most applied: ${helps.label}, ${helps.pct}% approved.` : `${NOT_ENOUGH}.`}>
        <WhatHelps board={board} />
      </Disclosure>
    </section>
  );
}
