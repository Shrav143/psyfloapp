"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/lib/core-ui/table";
import type { Denial } from "@/lib/demo/denials";
import { fmtDate, money } from "@/lib/demo/format";
import { PAYER_BY_ID } from "@/lib/demo/payers";
import { EmptyState, PayerChip } from "@/lib/demo-ui/primitives";
import { Pill, StatusBadge } from "@/lib/demo-ui/status-badge";
import { cn } from "@/lib/tailwind-utils";
import {
  categoryLabel,
  daysLeft,
  isResolved,
  ROUTE_META,
} from "./denial-helpers";

const HEADERS = [
  "Received",
  "Member",
  "Payer",
  "Type",
  "Code",
  "Category",
  "Validity",
  "Route",
  "Deadline",
  "$ at risk",
  "Status",
  "Owner",
];

export function DenialsTable({
  rows,
  selectedId,
  onSelect,
}: {
  rows: Denial[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="p-5">
        <EmptyState
          title="Nothing in this view"
          body="No denials match. Switch tabs or wait for the next payer letter."
        />
      </div>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {HEADERS.map((h) => (
            <TableHead
              key={h}
              className={cn(
                "whitespace-nowrap text-xs",
                h === "$ at risk" && "text-right",
              )}
            >
              {h}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((d) => {
          const payer = PAYER_BY_ID[d.payerId];
          const left = daysLeft(d.deadline);
          const urgent = !isResolved(d.status) && left <= 14;
          const route = ROUTE_META[d.route];
          return (
            <TableRow
              key={d.id}
              onClick={() => onSelect(d.id)}
              className={cn(
                "cursor-pointer hover:bg-slate-50",
                selectedId === d.id && "bg-indigo-50/60",
              )}
            >
              <TableCell className="whitespace-nowrap text-slate-600 text-xs tabular-nums">
                {fmtDate(d.receivedAt)}
              </TableCell>
              <TableCell className="font-medium text-slate-900">
                {d.mrn}
              </TableCell>
              <TableCell>
                <PayerChip color={payer.color} name={payer.short} />
              </TableCell>
              <TableCell>
                <Pill tone={d.kind === "pa" ? "violet" : "cyan"}>
                  {d.kind === "pa" ? "PA" : "Claim"}
                </Pill>
              </TableCell>
              <TableCell className="font-mono text-slate-700 text-xs">
                {d.code}
              </TableCell>
              <TableCell className="whitespace-nowrap text-slate-700 text-sm">
                {categoryLabel(d.category)}
              </TableCell>
              <TableCell>
                <StatusBadge status={d.validity} />
              </TableCell>
              <TableCell>
                <Pill tone={route.tone}>{route.label}</Pill>
              </TableCell>
              <TableCell
                className={cn(
                  "whitespace-nowrap text-xs tabular-nums",
                  urgent ? "font-medium text-rose-600" : "text-slate-600",
                )}
              >
                <div>{fmtDate(d.deadline)}</div>
                <div className={urgent ? "text-rose-500" : "text-slate-400"}>
                  {left >= 0 ? `${left}d left` : `${-left}d ago`}
                </div>
              </TableCell>
              <TableCell className="text-right text-slate-900 tabular-nums">
                {money(d.valueAtRisk)}
              </TableCell>
              <TableCell>
                <StatusBadge status={d.status} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-slate-600 text-xs">
                {d.owner}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
