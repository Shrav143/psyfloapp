"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Denial } from "@/lib/demo/denials";
import { fmtDate, money } from "@/lib/demo/format";
import { PAYER_BY_ID } from "@/lib/demo/payers";
import { PayerChip } from "@/lib/demo-ui/primitives";
import { StatusBadge } from "@/lib/demo-ui/status-badge";
import { cn } from "@/lib/tailwind-utils";
import {
  type AppealView,
  daysLeft,
  freeCareValue,
} from "../../~lib/appeal-helpers";

export function AppealHeader({
  appeal,
  denial,
}: {
  appeal: AppealView;
  denial?: Denial;
}) {
  const payer = PAYER_BY_ID[appeal.payerId];
  const left = daysLeft(appeal.deadline);
  const urgent = !appeal.outcome && left <= 14;
  const items: { k: string; v: string; className?: string }[] = [
    { k: "MRN", v: appeal.mrn },
    { k: "Payer", v: payer.short },
    {
      k: "Denial received",
      v: denial ? fmtDate(denial.receivedAt, true) : "—",
    },
    { k: "Code", v: denial?.code ?? "—" },
    { k: "Level", v: appeal.level },
    {
      k: "Deadline",
      v: `${fmtDate(appeal.deadline)} · ${left >= 0 ? `${left}d left` : `${-left}d ago`}`,
      className: urgent ? "text-rose-600" : undefined,
    },
    {
      k: "Free care so far",
      v: `${appeal.freeCareDays} days · ${money(freeCareValue(appeal.freeCareDays))}`,
      className: appeal.outcome ? undefined : "text-rose-600",
    },
  ];
  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/demo/appeals"
          className="inline-flex items-center gap-1 text-slate-500 text-xs hover:text-slate-800"
        >
          <ArrowLeft className="size-3" /> Appeals
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="font-semibold text-2xl text-slate-900 tracking-tight">
            Appeal workspace · {appeal.mrn}
          </h1>
          <StatusBadge status={appeal.status} />
          <PayerChip color={payer.color} name={payer.name} />
        </div>
        <div className="mt-1 text-slate-500 text-sm">
          H2020 · Therapeutic rehabilitation program · {appeal.level} written
          appeal · next: {appeal.nextStep}
        </div>
      </div>
      <div className="grid grid-cols-2 divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm sm:grid-cols-4 xl:grid-cols-7 xl:divide-x">
        {items.map((it) => (
          <div key={it.k} className="px-4 py-3">
            <div className="text-[11px] text-slate-500 uppercase tracking-wide">
              {it.k}
            </div>
            <div
              className={cn(
                "mt-0.5 truncate font-medium text-slate-900 text-sm tabular-nums",
                it.className,
              )}
              title={it.v}
            >
              {it.v}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
