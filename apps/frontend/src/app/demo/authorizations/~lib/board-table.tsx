"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/lib/core-ui/table";
import { fmtDate } from "@/lib/demo/format";
import { EmptyState, Panel, PayerChip } from "@/lib/demo-ui/primitives";
import { StatusBadge } from "@/lib/demo-ui/status-badge";
import { cn } from "@/lib/tailwind-utils";
import type { BoardRow } from "./board-model";

function AgingDot({ aging, days }: { aging: BoardRow["aging"]; days: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "size-2 rounded-full",
          aging === "rule"
            ? "bg-rose-500"
            : aging === "slow"
              ? "bg-amber-500"
              : "bg-slate-300",
        )}
      />
      <span className="tabular-nums">{days}d</span>
      {aging === "rule" ? (
        <span className="text-[10px] text-rose-600">past 7-day rule</span>
      ) : aging === "slow" ? (
        <span className="text-[10px] text-amber-600">past payer median</span>
      ) : null}
    </span>
  );
}

export function BoardTable({ rows }: { rows: BoardRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No requests match"
        body="Clear a filter to see the rest of the board."
      />
    );
  }
  return (
    <Panel padded={false}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>MRN</TableHead>
            <TableHead>Payer</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Days in state</TableHead>
            <TableHead>Units asked → granted</TableHead>
            <TableHead>Used</TableHead>
            <TableHead>Window</TableHead>
            <TableHead>Next action</TableHead>
            <TableHead>Owner</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.auth.id} className="hover:bg-slate-50">
              <TableCell>
                <Link
                  href={`/demo/authorizations/${r.auth.id}`}
                  className="font-medium text-indigo-700 hover:underline"
                >
                  {r.auth.mrn}
                </Link>
                <div className="text-slate-500 text-xs">
                  {r.patient.initials} ·{" "}
                  {r.patient.location === "lex" ? "Lex" : "Hop"}
                  {r.patient.dualEligible ? " · dual" : ""}
                </div>
              </TableCell>
              <TableCell>
                <PayerChip color={r.payerColor} name={r.payerShort} />
              </TableCell>
              <TableCell className="text-slate-600 text-xs">
                H2020 · TRP
              </TableCell>
              <TableCell>
                <StatusBadge status={r.auth.status} />
              </TableCell>
              <TableCell>
                <AgingDot aging={r.aging} days={r.daysInState} />
              </TableCell>
              <TableCell className="tabular-nums">
                {r.unitsAsked} →{" "}
                <span
                  className={
                    r.unitsGranted < r.unitsAsked
                      ? "font-medium text-amber-700"
                      : ""
                  }
                >
                  {r.unitsGranted}
                </span>
              </TableCell>
              <TableCell className="tabular-nums">
                {r.unitsGranted > 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          r.unitsUsed >= r.unitsGranted
                            ? "bg-rose-500"
                            : "bg-indigo-500",
                        )}
                        style={{
                          width: `${Math.min(100, (r.unitsUsed / r.unitsGranted) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs">
                      {r.unitsUsed}/{r.unitsGranted}
                    </span>
                  </div>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-slate-600 text-xs">
                {r.window}
              </TableCell>
              <TableCell className="max-w-[260px] text-slate-700 text-xs">
                {r.auth.nextAction}
                {r.fileBy ? (
                  <div className="text-amber-700">
                    File renewal by {fmtDate(r.fileBy)}
                  </div>
                ) : null}
              </TableCell>
              <TableCell className="text-slate-600 text-xs">
                {r.auth.owner}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Panel>
  );
}
