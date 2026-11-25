"use client";

import { Button } from "@/lib/core-ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/lib/core-ui/table";
import { money } from "@/lib/demo/format";
import type { LeakRow } from "@/lib/demo/leakage";
import { EmptyState, Panel } from "@/lib/demo-ui/primitives";
import { StatusBadge } from "@/lib/demo-ui/status-badge";

/** Why each cause exists, in one line, so nobody has to ask. */
const MEANING: Record<string, string> = {
  intake_lag:
    "Visits before the request date; the payer's backdate cannot reach them.",
  awaiting_decision:
    "Care delivered while the payer's clock runs; billable once approved and backdated.",
  units_exhausted:
    "Attendance ran past the approved units before the renewal landed.",
  window_expired: "The authorization window closed before the renewal landed.",
  denied_in_appeal:
    "Care continued during an appeal; paid only if the appeal wins.",
  no_auth: "No request was ever filed for these visits.",
  eligibility_lapsed:
    "The member's Medicaid coverage ended; nobody can be billed.",
  partial_shortfall:
    "Units asked minus units granted on partial approvals; appealable, rarely appealed.",
  discharged:
    "Three patients discharged after a final denial, 13 visit days a month each, going forward.",
};

export function LeakageTable({
  rows,
  filtered,
  onClear,
}: {
  rows: LeakRow[];
  filtered: boolean;
  onClear: () => void;
}) {
  const visits = rows.reduce((n, r) => n + r.visits, 0);
  const value = rows.reduce((n, r) => n + r.value, 0);
  return (
    <Panel
      title="The waterfall"
      description="Each row is a count of visit days in the ledger that could not be billed, times the H2020 rate. The tag says whose problem it is."
      right={
        filtered ? (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Show all causes
          </Button>
        ) : null
      }
      padded={false}
    >
      {rows.length === 0 ? (
        <div className="p-5">
          <EmptyState title="No rows carry this tag in the period" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cause</TableHead>
              <TableHead className="text-right">Visits / units</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead>Tag</TableHead>
              <TableHead>Recoverable?</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.key}>
                <TableCell className="max-w-[320px] whitespace-normal">
                  <div className="font-medium text-slate-900">{r.label}</div>
                  <div className="text-slate-500 text-xs">
                    {MEANING[r.key] ?? ""}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.visits}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {money(r.value)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.tag} />
                </TableCell>
                <TableCell className="text-slate-600 text-xs">
                  {r.recoverable}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-medium">
                Total{filtered ? " (filtered)" : ""}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {visits}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {money(value)}
              </TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </TableFooter>
        </Table>
      )}
    </Panel>
  );
}
