import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Card, CardHeader, Sparkline, Table, Td, Th, Tr } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { BuiltInPayerId } from "@/data/types";
import type { Board, ScoreRow } from "./board";
import type { CaseQuery } from "./query";
import { CMS_NOTE } from "./copy";
import { fmt, pctOf } from "./stats";

const dash = "-";
const pct = (v: number | null): string => (v === null ? dash : `${v}%`);

function Trend({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-muted">{dash}</span>;
  const Icon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
  return (
    <span className={cn("inline-flex items-center gap-1 font-medium whitespace-nowrap", delta > 0 ? "text-good" : delta < 0 ? "text-risk" : "text-muted")}>
      <Icon size={14} className="ico" aria-hidden="true" />
      {delta === 0 ? "level" : `${delta > 0 ? "+" : "-"}${Math.abs(delta)} pts`}
    </span>
  );
}

const cell = "px-3 py-3.5";
const head = "px-3 py-3 text-right";

/** One row per payer: how many decisions, how often it approves as requested (with twelve months beside it), denials, cuts, time, information requests, appeals. A row opens the payer's analysis. */
export function Scorecard({ board, onPayer, onCases }: { board: Board; onPayer: (p: BuiltInPayerId) => void; onCases: (q: CaseQuery) => void }) {
  const { period } = board;
  const figure = (r: ScoreRow, title: string, q: Partial<CaseQuery>) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onCases({ ...q, ...(r.payer === "all" ? {} : { payer: r.payer }), title: `${r.name}: ${title}` });
  };
  return (
    <Card data-testid="scorecard">
      <CardHeader title="Payer scorecard" subtitle={`${period.label}. Click a payer to open its analysis; click a count to list its cases.`} />
      <Table>
        <thead>
          <tr>
            <Th className="px-3 py-3 first:pl-6">Payer</Th>
            <Th className={head}>Decisions</Th>
            <Th className={head}>Approval rate</Th>
            <Th className={head}>Denial rate</Th>
            <Th className={head}>Approved in part</Th>
            <Th className={head}>Average days</Th>
            <Th className={head}>Past CMS time</Th>
            <Th className={head}>Info requests</Th>
            <Th className={head}>Appeals overturned</Th>
            <Th className={cn(head, "last:pr-6")}>Trend</Th>
          </tr>
        </thead>
        <tbody>
          {board.score.map((r) => {
            const total = r.payer === "all";
            return (
              <Tr key={r.payer} onClick={total ? undefined : () => onPayer(r.payer as BuiltInPayerId)} data-payer={r.payer} className={cn(total && "bg-[#FBF8F3] font-semibold")}>
                <Td className={cn(cell, "first:pl-6")}>
                  {total ? (
                    <div>
                      <div>{r.name}</div>
                      <div className="text-[12px] font-normal text-muted">{r.plan}</div>
                    </div>
                  ) : (
                    <button type="button" onClick={(e) => (e.stopPropagation(), onPayer(r.payer as BuiltInPayerId))} aria-label={`${r.name}: open the payer analysis`} className="text-left">
                      <span className="block font-semibold underline decoration-1 underline-offset-[3px] hover:text-forest">{r.name}</span>
                      <span className="block text-[12px] text-muted">{r.plan}</span>
                    </button>
                  )}
                </Td>
                <Td className={cn(cell, "text-right tabular-nums")}>{fmt(r.s.n)}</Td>
                <Td className={cn(cell, "text-right")}>
                  <span className="inline-flex items-center justify-end gap-2.5">
                    <Sparkline data={r.spark} width={64} height={22} color={r.approval !== null && r.approval < 55 ? "#B5553A" : "#2F6F5C"} />
                    <b className="w-[40px] text-right tabular-nums" data-testid={`rate-${r.payer}`}>{pct(r.approval)}</b>
                  </span>
                </Td>
                <Td className={cn(cell, "text-right tabular-nums")}>{pct(r.denial)}</Td>
                <Td className={cn(cell, "text-right tabular-nums")}>
                  <button type="button" onClick={figure(r, "approved in part", { outcome: "partial" })} aria-label={`${r.name}: ${r.partial} approved in part. List the cases.`} className="underline decoration-dotted underline-offset-[3px] hover:text-forest">
                    {fmt(r.partial)}
                  </button>
                  <span className="ml-1 text-[12px] font-normal text-muted">({pct(pctOf(r.partial, r.s.n))})</span>
                </Td>
                <Td className={cn(cell, "text-right tabular-nums")}>{r.days === null ? dash : r.days.toFixed(1)}</Td>
                <Td className={cn(cell, "text-right tabular-nums")}>
                  {r.cms ? (
                    <button type="button" onClick={figure(r, "past the CMS decision time", { flag: "pastCms" })} aria-label={`${r.name}: ${r.s.pastCms} decisions past the CMS time. List the cases.`} className="underline decoration-dotted underline-offset-[3px] hover:text-forest">
                      {pct(r.pastCms)}
                    </button>
                  ) : (
                    <span className="text-[12px] font-normal text-muted" title="The CMS decision time applies to the Medicaid managed care plans">n/a</span>
                  )}
                </Td>
                <Td className={cn(cell, "text-right tabular-nums")}>
                  <button type="button" onClick={figure(r, "information requested", { flag: "infoRequest" })} aria-label={`${r.name}: ${r.info} information requests. List the cases.`} className="underline decoration-dotted underline-offset-[3px] hover:text-forest">
                    {fmt(r.info)}
                  </button>
                  <span className="ml-1 text-[12px] font-normal text-muted">({pct(pctOf(r.info, r.s.n))})</span>
                </Td>
                <Td className={cn(cell, "text-right tabular-nums")}>
                  {r.s.rulings > 0 ? (
                    <button type="button" onClick={figure(r, "appeals ruled on", { flag: "ruled" })} aria-label={`${r.name}: ${r.s.overturned} of ${r.s.rulings} appeals overturned. List the cases.`} className="underline decoration-dotted underline-offset-[3px] hover:text-forest">
                      {pct(r.overturn)}
                    </button>
                  ) : (
                    dash
                  )}
                  {r.s.rulings > 0 ? <span className="ml-1 text-[12px] font-normal text-muted">({r.s.overturned} of {r.s.rulings})</span> : null}
                </Td>
                <Td className={cn(cell, "text-right last:pr-6")}>
                  <Trend delta={r.trend} />
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
      <p className="border-t border-line px-6 py-3 text-[12.5px] text-muted">
        Approval rate is approved as requested. Trend compares {period.compare.words.replace(/^vs /, "with the ")}. A figure under 20 decisions shows a dash. Each payer is compared with the clinic's own average in the last row, not with an outside benchmark. {CMS_NOTE}
      </p>
    </Card>
  );
}
