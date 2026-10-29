"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { TableCell, TableRow } from "@/lib/core-ui/table";
import type { ScorecardRow } from "@/lib/demo/analytics";
import { pct } from "@/lib/demo/format";
import { PAYER_BY_ID } from "@/lib/demo/payers";
import type { PayerId } from "@/lib/demo/types";
import { PayerChip } from "@/lib/demo-ui/primitives";
import { Pill } from "@/lib/demo-ui/status-badge";
import { cn } from "@/lib/tailwind-utils";

function signed(pts: number): string {
  return pts > 0 ? `+${pts}` : String(pts);
}

function Trend({ pts }: { pts: number }) {
  const Icon = pts < 0 ? ArrowDownRight : pts > 0 ? ArrowUpRight : Minus;
  const tone =
    pts <= -8
      ? "font-medium text-rose-600"
      : pts < 0
        ? "text-amber-700"
        : "text-slate-600";
  return (
    <span className={cn("inline-flex items-center gap-1 tabular-nums", tone)}>
      <Icon className="size-3.5" />
      {signed(pts)} pts
    </span>
  );
}

export function ScorecardRowView({
  row,
  onSelect,
}: {
  row: ScorecardRow;
  onSelect: (id: PayerId) => void;
}) {
  const payer = PAYER_BY_ID[row.payerId];
  const gap =
    row.published === undefined
      ? undefined
      : Math.round((row.firstPass - row.published) * 100);
  return (
    <TableRow
      onClick={() => onSelect(row.payerId)}
      title={`Open ${payer.short}: channels, rule tuple, policy changes`}
      className="cursor-pointer hover:bg-slate-50"
    >
      <TableCell>
        <PayerChip color={payer.color} name={payer.short} />
      </TableCell>
      <TableCell className="tabular-nums">{row.requests}</TableCell>
      <TableCell
        className={cn(
          "font-medium tabular-nums",
          row.firstPass < 0.65 ? "text-rose-600" : "text-slate-900",
        )}
      >
        {pct(row.firstPass)}
      </TableCell>
      <TableCell
        className={cn(
          "tabular-nums",
          row.partial > 0.2 ? "font-medium text-amber-700" : "text-slate-700",
        )}
      >
        {pct(row.partial)}
      </TableCell>
      <TableCell className="tabular-nums">
        {row.avgAsked} →{" "}
        <span
          className={
            row.avgGranted < row.avgAsked ? "font-medium text-amber-700" : ""
          }
        >
          {row.avgGranted}
        </span>
      </TableCell>
      <TableCell
        className={cn(
          "tabular-nums",
          row.medianDays > 7 ? "font-medium text-amber-700" : "text-slate-700",
        )}
      >
        {row.medianDays}d
        {row.medianDays > 7 ? (
          <span className="ml-1 text-[10px]">past rule</span>
        ) : null}
      </TableCell>
      <TableCell className="tabular-nums">{pct(row.p2p)}</TableCell>
      <TableCell className="tabular-nums">{pct(row.appealWin)}</TableCell>
      <TableCell>
        <Trend pts={row.trendPts} />
      </TableCell>
      <TableCell className="text-xs tabular-nums">
        {gap === undefined || row.published === undefined ? (
          "Not published"
        ) : (
          <>
            <div className="text-slate-700">
              {pct(row.published)} published · {pct(row.firstPass)} observed
            </div>
            <div
              className={
                gap <= -10 ? "font-medium text-rose-600" : "text-slate-500"
              }
            >
              {signed(gap)} pts
            </div>
          </>
        )}
      </TableCell>
      <TableCell>
        {row.criteria === "unconfirmed" ? (
          <Pill tone="amber">unconfirmed — ask</Pill>
        ) : (
          <span className="text-slate-700">{row.criteria}</span>
        )}
      </TableCell>
    </TableRow>
  );
}
