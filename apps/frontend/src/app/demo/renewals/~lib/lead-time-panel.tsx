"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/lib/core-ui/table";
import { PAYERS } from "@/lib/demo/payers";
import { Panel, PayerChip } from "@/lib/demo-ui/primitives";
import { cn } from "@/lib/tailwind-utils";
import type { RadarRow } from "./radar-model";

export function LeadTimePanel({
  rows,
  buffer,
}: {
  rows: RadarRow[];
  buffer: number;
}) {
  const mcos = PAYERS.filter((p) => p.kind === "mco");
  const slowest = Math.max(...mcos.map((p) => p.medianDecisionDays));
  return (
    <Panel
      title="Lead time is a setting, not a constant"
      description={`File-by = binding clock − (payer median turnaround + ${buffer}-day buffer). Computed per payer.`}
      padded={false}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Payer</TableHead>
            <TableHead className="text-right">Median decision</TableHead>
            <TableHead className="text-right">7-day rule</TableHead>
            <TableHead className="text-right">Lead days</TableHead>
            <TableHead className="text-right">On radar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mcos.map((p) => {
            const onRadar = rows.filter((r) => r.auth.payerId === p.id).length;
            const isSlowest = p.medianDecisionDays === slowest;
            return (
              <TableRow
                key={p.id}
                className={cn(isSlowest && "bg-amber-50/60")}
              >
                <TableCell>
                  <PayerChip color={p.color} name={p.short} />
                  {isSlowest ? (
                    <span className="ml-2 text-[11px] text-amber-700">
                      files earliest
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-right text-slate-700 tabular-nums">
                  {p.medianDecisionDays} d
                </TableCell>
                <TableCell className="text-right text-slate-700 tabular-nums">
                  {p.decisionSlaDays} d
                  {p.medianDecisionDays > p.decisionSlaDays ? (
                    <span className="ml-1 text-rose-600">
                      · routinely missed
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-right font-semibold text-slate-900 tabular-nums">
                  {p.medianDecisionDays + buffer} d
                </TableCell>
                <TableCell className="text-right text-slate-700 tabular-nums">
                  {onRadar}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <p className="border-slate-100 border-t px-5 py-3 text-slate-600 text-xs">
        The payer that takes longest needs filing earliest; nobody tracks that
        today.
      </p>
    </Panel>
  );
}
