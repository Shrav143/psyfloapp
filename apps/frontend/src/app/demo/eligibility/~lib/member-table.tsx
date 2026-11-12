"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/lib/core-ui/table";
import { ELIG_STATUS_LABEL, type EligStatus } from "@/lib/demo/eligibility";
import { fmtDate, relativeDays } from "@/lib/demo/format";
import { PAYER_BY_ID } from "@/lib/demo/payers";
import { EmptyState, Panel, PayerChip } from "@/lib/demo-ui/primitives";
import { Pill, StatusBadge } from "@/lib/demo-ui/status-badge";
import { cn } from "@/lib/tailwind-utils";
import { type EligRow, LOCATION_LABEL, STATUS_ORDER } from "./elig-model";

export type StatusFilter = EligStatus | "all";

export function StatusChips({
  rows,
  value,
  onChange,
}: {
  rows: EligRow[];
  value: StatusFilter;
  onChange: (s: StatusFilter) => void;
}) {
  const counts = STATUS_ORDER.map((s) => ({
    s,
    n: rows.filter((r) => r.status === s).length,
  })).filter((c) => c.n > 0);
  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-xs transition-colors",
      active
        ? "border-slate-900 bg-slate-900 text-white"
        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    );
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={chip(value === "all")}
      >
        All · {rows.length}
      </button>
      {counts.map((c) => (
        <button
          key={c.s}
          type="button"
          onClick={() => onChange(value === c.s ? "all" : c.s)}
          className={chip(value === c.s)}
        >
          {ELIG_STATUS_LABEL[c.s]} · {c.n}
        </button>
      ))}
    </div>
  );
}

export function MemberTable({
  title,
  description,
  rows,
  resolved,
  onSelect,
  emptyTitle,
  emptyBody,
}: {
  title: string;
  description: string;
  rows: EligRow[];
  resolved: string[];
  onSelect: (row: EligRow) => void;
  emptyTitle: string;
  emptyBody: string;
}) {
  return (
    <Panel title={title} description={description} padded={false}>
      {rows.length === 0 ? (
        <div className="p-5">
          <EmptyState title={emptyTitle} body={emptyBody} />
        </div>
      ) : (
        <Table className="[&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3">
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Appointment</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>What to do</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Last verified</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const payer = PAYER_BY_ID[r.payerId];
              const done = resolved.includes(r.id);
              return (
                <TableRow
                  key={r.id}
                  onClick={() => onSelect(r)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <TableCell>
                    <div className="font-medium text-slate-900">{r.mrn}</div>
                    <div className="text-slate-500 text-xs">
                      {r.initials} · {LOCATION_LABEL[r.location]}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-slate-900">
                      {fmtDate(r.appointmentDate)}
                    </div>
                    <div className="text-slate-500 text-xs">
                      {relativeDays(r.appointmentDate)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <PayerChip color={payer.color} name={payer.short} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                    {done ? (
                      <div className="mt-1">
                        <Pill tone="slate">Resolved by you</Pill>
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="max-w-[440px] whitespace-normal text-slate-700 text-xs leading-relaxed">
                    {r.headline}
                  </TableCell>
                  <TableCell className="text-slate-600 text-xs">
                    {r.source}
                  </TableCell>
                  <TableCell className="text-slate-600 text-xs">
                    {fmtDate(r.lastVerifiedAt)}
                    <div className="text-slate-400">
                      {relativeDays(r.lastVerifiedAt)}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}
