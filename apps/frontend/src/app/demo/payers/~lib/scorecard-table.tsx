"use client";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/lib/core-ui/table";
import type { ScorecardRow } from "@/lib/demo/analytics";
import { QUARTERS } from "@/lib/demo/payers";
import type { PayerId } from "@/lib/demo/types";
import { Panel } from "@/lib/demo-ui/primitives";
import { ScorecardRowView } from "./scorecard-row";

function Head({ label, note }: { label: string; note?: string }) {
  return (
    <TableHead className="align-bottom">
      <div>{label}</div>
      {note ? (
        <div className="max-w-[160px] whitespace-normal font-normal text-[10px] text-slate-400 leading-tight">
          {note}
        </div>
      ) : null}
    </TableHead>
  );
}

const CURRENT = QUARTERS[QUARTERS.length - 1] ?? "";
const TREND_FROM = QUARTERS[QUARTERS.length - 4] ?? "";

export function ScorecardTable({
  rows,
  onSelect,
}: {
  rows: ScorecardRow[];
  onSelect: (id: PayerId) => void;
}) {
  return (
    <Panel
      title="Scorecard · Kentucky Medicaid MCOs · H2020"
      description={`Current quarter (${CURRENT}). Click a payer for channels, the rule tuple and detected policy changes. Thresholds: first-pass below 65%, partial above 20%, median past the 7-day rule, trend at or below −8 pts.`}
      padded={false}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <Head label="Payer" />
            <Head label="Requests" note="decided initial + renewal versions" />
            <Head
              label="First-pass approval"
              note="approved in full at first decision"
            />
            <Head label="Partial rate" note="fewer units granted than asked" />
            <Head label="Avg asked → granted" note="units per request" />
            <Head label="Median decision days" note="7-day rule" />
            <Head
              label="P2P reversal"
              note="denials reversed after peer-to-peer"
            />
            <Head label="Appeal win" note="written appeals won" />
            <Head
              label="Trend"
              note={`${TREND_FROM} → ${CURRENT}, first-pass`}
            />
            <Head
              label="Published vs observed"
              note="Medicaid MCOs must publish PA metrics annually since 2026"
            />
            <Head label="Criteria set" note="known field, or unconfirmed" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <ScorecardRowView key={r.payerId} row={r} onSelect={onSelect} />
          ))}
        </TableBody>
      </Table>
      <div className="border-slate-100 border-t px-5 py-3 text-slate-500 text-xs">
        Medicare (traditional) is excluded: 14-day decision SLA, fax-only, no
        published PA metrics. Rates are computed from decided versions in the
        ledger; requests still pending are not counted.
      </div>
    </Panel>
  );
}
