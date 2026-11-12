"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/lib/core-ui/table";
import { fmtDate, money } from "@/lib/demo/format";
import { EmptyState, Panel } from "@/lib/demo-ui/primitives";
import { laneTotals, type RadarRow, weekPlan } from "./radar-model";

export function WeekPlanPanel({ rows }: { rows: RadarRow[] }) {
  const plan = weekPlan(rows);
  const total = laneTotals(rows);
  return (
    <Panel
      title="Week plan"
      description="This week's packets by signing clinician, so the week can actually be staffed."
      padded={false}
    >
      {plan.length === 0 ? (
        <div className="p-5">
          <EmptyState
            title="Nothing due this week"
            body="Raise the lead-time buffer to pull next month's renewals forward."
          />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Signer</TableHead>
              <TableHead className="text-right">Packets</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plan.map((g) => (
              <TableRow key={g.signer}>
                <TableCell>
                  <div className="font-medium text-slate-900">{g.signer}</div>
                  <div className="text-slate-500 text-xs">
                    {g.packets
                      .map((r) => `${r.patient.mrn} by ${fmtDate(r.fileBy)}`)
                      .join(" · ")}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {g.packets.length}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {g.hours} h
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {money(g.cost)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-slate-50 font-medium">
              <TableCell>Total</TableCell>
              <TableCell className="text-right tabular-nums">
                {total.count}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {total.hours} h
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {money(total.cost)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}
