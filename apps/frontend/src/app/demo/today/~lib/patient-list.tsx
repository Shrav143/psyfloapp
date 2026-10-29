"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/lib/core-ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/lib/core-ui/table";
import { REASON_LABEL } from "@/lib/demo/derive";
import { fmtDate } from "@/lib/demo/format";
import { PAYER_BY_ID } from "@/lib/demo/payers";
import type { PayerId, VisitReason } from "@/lib/demo/types";
import { EmptyState, Panel, PayerChip } from "@/lib/demo-ui/primitives";
import { StatusBadge } from "@/lib/demo-ui/status-badge";
import type { TodayRow } from "./today-client";

export function PatientList({
  rows,
  filter,
  onClear,
}: {
  rows: TodayRow[];
  filter: VisitReason | "all";
  onClear: () => void;
}) {
  return (
    <Panel
      title={
        filter === "all" ? "Patients not covered today" : REASON_LABEL[filter]
      }
      description="MRN and initials only. Click a row for the two clocks and the full history."
      right={
        filter !== "all" ? (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear filter
          </Button>
        ) : null
      }
      padded={false}
    >
      {rows.length === 0 ? (
        <div className="p-5">
          <EmptyState
            title="Nothing here"
            body="No patients match this cause today."
          />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead>Why not billable</TableHead>
              <TableHead>Clocks</TableHead>
              <TableHead>Board status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.mrn} className="hover:bg-slate-50">
                <TableCell>
                  <div className="font-medium text-slate-900">{r.mrn}</div>
                  <div className="text-slate-500 text-xs">{r.initials}</div>
                </TableCell>
                <TableCell className="text-slate-600">{r.location}</TableCell>
                <TableCell>
                  <PayerChip
                    color={PAYER_BY_ID[r.payerId as PayerId].color}
                    name={PAYER_BY_ID[r.payerId as PayerId].short}
                  />
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.reason} />
                  {r.short ? (
                    <div className="mt-1 text-rose-600 text-xs">{r.short}</div>
                  ) : null}
                </TableCell>
                <TableCell className="text-slate-600 text-xs">
                  {r.unitsRemaining !== undefined ? (
                    <div>
                      {r.unitsRemaining} units left · {r.daysRemaining}d in
                      window
                    </div>
                  ) : (
                    <div>—</div>
                  )}
                  {r.fileBy ? (
                    <div className="text-amber-700">
                      File by {fmtDate(r.fileBy)}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell className="text-right">
                  {r.authId ? (
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/demo/authorizations/${r.authId}`}>
                        Open <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}
