"use client";

import { ArrowUpRight, FilePlus2, FileSignature } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/lib/core-ui/button";
import { fmtDate, money, relativeDays } from "@/lib/demo/format";
import { PAYER_BY_ID } from "@/lib/demo/payers";
import { useDemoStore } from "@/lib/demo/store";
import { PayerChip } from "@/lib/demo-ui/primitives";
import { Pill, StatusBadge } from "@/lib/demo-ui/status-badge";
import { cn } from "@/lib/tailwind-utils";
import {
  HOURS_PER_PACKET,
  PACKET_COST,
  type RadarRow,
  shortName,
} from "./radar-model";

function MiniBar({
  label,
  used,
  total,
  active,
}: {
  label: string;
  used: number;
  total: number;
  active: boolean;
}) {
  const pctUsed = total ? Math.min(100, Math.round((used / total) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px] text-slate-500">
        <span>{label}</span>
        <span className="tabular-nums">
          {used}/{total}
        </span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            "h-full rounded-full",
            active ? "bg-indigo-500" : "bg-slate-400",
          )}
          style={{ width: `${pctUsed}%` }}
        />
      </div>
    </div>
  );
}

/** One line that says which clock ends this authorization and when. */
function bindingStatement(row: RadarRow): { text: string; tone: string } {
  const c = row.clocks;
  if (row.ended === "units") {
    return {
      text: `Units ran out ${fmtDate(row.bindingDate)} · patient still attending`,
      tone: "font-medium text-rose-700",
    };
  }
  if (row.ended === "days") {
    return {
      text: `Window closed ${fmtDate(c.windowEnd)} · patient still attending`,
      tone: "font-medium text-rose-700",
    };
  }
  if (c.binding === "units") {
    return {
      text: `Units bind · ${c.unitsRemaining} left · run out ${fmtDate(c.exhaustionDate)}`,
      tone: "text-slate-700",
    };
  }
  const stranded =
    c.strandedUnits > 0
      ? `${c.strandedUnits} units will be stranded`
      : "all units used in time";
  return {
    text: `Window closes ${fmtDate(c.windowEnd)} · ${stranded}`,
    tone: c.strandedUnits > 3 ? "text-amber-800" : "text-slate-700",
  };
}

export function RenewalCard({
  row,
  assumeBackdated,
}: {
  row: RadarRow;
  assumeBackdated: boolean;
}) {
  const queue = useDemoStore((s) => s.signoffQueue);
  const addToSignoff = useDemoStore((s) => s.addToSignoff);
  const { auth, patient, clocks } = row;
  const payer = PAYER_BY_ID[auth.payerId];
  const queued = queue.includes(auth.id) || auth.status === "awaiting_signoff";
  const overdue = row.lane === "overdue";
  const binding = bindingStatement(row);
  const totalDays = clocks.daysElapsed + clocks.daysRemaining;
  const startRenewal = () => {
    addToSignoff(auth.id);
    toast.success(
      `Renewal packet queued for ${shortName(row.signer)} — nothing is sent`,
      {
        description: `${patient.mrn} · ${payer.short} · drafted from Sunwave, lands in the clinician sign-off queue`,
      },
    );
  };
  return (
    <article
      className={cn(
        "rounded-lg border bg-white p-3 shadow-sm",
        overdue ? "border-rose-200" : "border-slate-200",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-slate-900 text-sm">
            {patient.mrn}{" "}
            <span className="font-normal text-slate-500">
              · {patient.initials}
            </span>
          </div>
          <PayerChip color={payer.color} name={payer.short} />
        </div>
        <StatusBadge status={auth.status} />
      </div>
      <div className={cn("mt-2 text-xs", binding.tone)}>{binding.text}</div>
      <div
        className={cn(
          "text-xs",
          overdue
            ? "font-semibold text-rose-700"
            : "font-medium text-slate-800",
        )}
      >
        File by {fmtDate(row.fileBy)} ({relativeDays(row.fileBy)})
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <MiniBar
          label="Units"
          used={clocks.unitsUsed}
          total={clocks.version.unitsGranted}
          active={clocks.binding === "units"}
        />
        <MiniBar
          label="Days"
          used={clocks.daysElapsed}
          total={totalDays}
          active={clocks.binding === "days"}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
        <span>
          Est. {HOURS_PER_PACKET} h · {money(PACKET_COST)}
        </span>
        <span>
          {row.leadDays}-day lead · {payer.short}
        </span>
      </div>
      {row.gapDays > 0 ? (
        <div className="mt-1 font-medium text-rose-600 text-xs">
          Gap: {row.gapDays} days · {row.gapVisits} visits ·{" "}
          {money(row.gapValue)} unbilled so far ·{" "}
          {assumeBackdated ? "recoverable if backdated" : "lost"}
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {queued ? (
          <Pill tone="violet" className="h-8 px-2.5">
            <FileSignature className="size-3.5" /> Queued
          </Pill>
        ) : (
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={startRenewal}
          >
            <FileSignature className="size-4" /> Start renewal
          </Button>
        )}
        <Button asChild variant="outline" size="sm">
          <Link href={`/demo/authorizations/${auth.id}`}>
            Open <ArrowUpRight className="size-4" />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link
            href={`/demo/authorizations/new?mrn=${patient.mrn}&kind=renewal`}
          >
            <FilePlus2 className="size-4" /> Draft packet
          </Link>
        </Button>
      </div>
    </article>
  );
}
