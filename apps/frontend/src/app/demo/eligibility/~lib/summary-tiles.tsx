"use client";

import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/lib/core-ui/button";
import { visitValue } from "@/lib/demo/derive";
import { fmtDate, money } from "@/lib/demo/format";
import { StatTile } from "@/lib/demo-ui/primitives";
import { Pill } from "@/lib/demo-ui/status-badge";
import {
  type EligRow,
  LAPSE,
  LOCATION_LABEL,
  type Summary,
} from "./elig-model";

export function SummaryTiles({
  summary,
  onExceptions,
  onLapsed,
  onMedicare,
}: {
  summary: Summary;
  onExceptions: () => void;
  onLapsed: () => void;
  onMedicare: () => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatTile
        label="Verified"
        value={summary.verified}
        tone="green"
        hint={`of ${summary.total} members with an appointment in the next 7 days`}
      />
      <StatTile
        label="Exceptions"
        value={summary.exceptions}
        tone="red"
        hint="each with a one-line action written by Verify"
        onClick={onExceptions}
      />
      <StatTile
        label="Inactive / lapsed"
        value={summary.inactive}
        tone="amber"
        hint="coverage ended · billing at risk"
        onClick={onLapsed}
      />
      <StatTile
        label="Medicare-first"
        value={summary.medicareFirst}
        tone="blue"
        hint="dual-eligibles · Medicare must deny before Medicaid pays"
        onClick={onMedicare}
      />
      <StatTile
        label="Checked at"
        value={summary.checkedAt.slice(11)}
        hint="next run tomorrow 06:10 · every member, every morning"
      />
    </div>
  );
}

/** The one member whose coverage ended while visits kept being delivered. */
export function LapsedCallout({ row }: { row: EligRow }) {
  const [paused, setPaused] = useState(false);
  const atRisk = money(visitValue(LAPSE.visitsSince));
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4">
      <AlertTriangle className="size-5 shrink-0 text-rose-600" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-rose-700 uppercase tracking-wide">
          {row.mrn} · {row.initials} · {LOCATION_LABEL[row.location]} · Medicaid
          lapsed
        </div>
        <div className="mt-0.5 font-semibold text-rose-900 text-sm">
          Coverage ended {fmtDate(LAPSE.endedOn)} — {LAPSE.visitsSince} visits
          delivered since, {atRisk} at risk
        </div>
        <div className="mt-0.5 text-rose-800 text-xs">{row.detail}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {paused ? (
          <Pill tone="red">Billing paused · guardian notified</Pill>
        ) : (
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => {
              setPaused(true);
              toast.success(`Billing paused for ${row.mrn}`, {
                description:
                  "Hold noted on the ledger and a re-verification request drafted for the guardian. Nothing is sent to the payer.",
              });
            }}
          >
            Pause billing & notify guardian
          </Button>
        )}
        {row.authId ? (
          <Button asChild size="sm" variant="outline">
            <Link href={`/demo/authorizations/${row.authId}`}>
              Open authorization <ArrowRight className="size-4" />
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
