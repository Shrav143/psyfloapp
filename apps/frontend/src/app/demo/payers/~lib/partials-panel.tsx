"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/lib/core-ui/table";
import { partialDetail } from "@/lib/demo/analytics";
import { fmtDate, money, pct, VISIT_RATE } from "@/lib/demo/format";
import { PAYER_BY_ID } from "@/lib/demo/payers";
import { EmptyState, Panel, PayerChip } from "@/lib/demo-ui/primitives";
import { shortfallByPayer } from "./scorecard-model";

function Headline() {
  const { ranked, totalUnits } = shortfallByPayer();
  const top = ranked[0];
  const next = ranked[1];
  if (!top || totalUnits === 0) {
    return null;
  }
  return (
    <div className="border-slate-100 border-b px-5 py-3 text-slate-700 text-sm">
      <span className="font-medium text-slate-900">{top.short}</span> accounts
      for the most shortfall units: {top.units} of {totalUnits} (
      {pct(top.units / totalUnits)}) across {top.count} partial decisions
      {next ? (
        <>
          , then {next.short} with {next.units} across {next.count}
        </>
      ) : null}
      . Shortfall is valued at {money(VISIT_RATE, { cents: true })} per unit,
      the H2020 per-visit-day rate.
    </div>
  );
}

export function PartialsPanel() {
  const rows = partialDetail();
  return (
    <Panel
      title="Partial approvals"
      description="Every decision in the last 180 days where the payer granted fewer units than asked. Partial is its own state in the ledger; Sunwave records it as approved."
      padded={false}
    >
      {rows.length === 0 ? (
        <div className="p-5">
          <EmptyState title="No partial approvals in the last 180 days" />
        </div>
      ) : (
        <>
          <Headline />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Decided</TableHead>
                <TableHead>MRN</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead>Asked → granted</TableHead>
                <TableHead className="text-right">Shortfall</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={`${r.mrn}-${r.payerId}-${r.decidedAt}`}>
                  <TableCell className="text-slate-600">
                    {fmtDate(r.decidedAt)}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">
                    {r.mrn}
                  </TableCell>
                  <TableCell>
                    <PayerChip
                      color={PAYER_BY_ID[r.payerId].color}
                      name={PAYER_BY_ID[r.payerId].short}
                    />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {r.asked} →{" "}
                    <span className="font-medium text-amber-700">
                      {r.granted}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.shortfall} units
                  </TableCell>
                  <TableCell className="text-right font-medium text-rose-600 tabular-nums">
                    {money(r.shortfall * VISIT_RATE)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </Panel>
  );
}
