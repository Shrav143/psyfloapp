"use client";

import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/lib/core-ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/lib/core-ui/sheet";
import { fmtDate, relativeDays } from "@/lib/demo/format";
import { PAYER_BY_ID } from "@/lib/demo/payers";
import { PayerChip } from "@/lib/demo-ui/primitives";
import { Pill, StatusBadge } from "@/lib/demo-ui/status-badge";
import { cn } from "@/lib/tailwind-utils";
import { type EligRow, isException, LOCATION_LABEL } from "./elig-model";
import { MemberFacts, RerunBlock, type RerunPhase } from "./member-detail";

type Props = {
  row?: EligRow;
  resolved: boolean;
  onClose: () => void;
  onResolve: (id: string) => void;
};

export function MemberSheet({ row, resolved, onClose, onResolve }: Props) {
  return (
    <Sheet
      open={Boolean(row)}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
        }
      }}
    >
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg">
        {row ? (
          <SheetBody
            key={row.id}
            row={row}
            resolved={resolved}
            onClose={onClose}
            onResolve={onResolve}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function SheetBody({
  row,
  resolved,
  onClose,
  onResolve,
}: Props & { row: EligRow }) {
  const [phase, setPhase] = useState<RerunPhase>("idle");
  const [attempt, setAttempt] = useState(0);
  const payer = PAYER_BY_ID[row.payerId];
  const exception = isException(row.status);
  const rerunDone = useCallback(() => {
    setPhase("done");
    toast.info("No change", {
      description: `${row.mrn} · same result as the 06:10 check. Nothing written to the chart.`,
    });
  }, [row.mrn]);
  const tone =
    row.status === "inactive"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : exception
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-emerald-200 bg-emerald-50 text-emerald-900";
  return (
    <>
      <SheetHeader className="border-b px-5 py-4">
        <SheetTitle className="flex flex-wrap items-center gap-2 text-base">
          {row.mrn}
          <span className="font-normal text-slate-500">{row.initials}</span>
          <StatusBadge status={row.status} />
          {resolved ? <Pill tone="slate">Resolved by you</Pill> : null}
        </SheetTitle>
        <SheetDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <PayerChip color={payer.color} name={payer.name} />
          <span>
            Appointment {fmtDate(row.appointmentDate)} ·{" "}
            {relativeDays(row.appointmentDate)}
          </span>
          <span>{LOCATION_LABEL[row.location]}</span>
        </SheetDescription>
      </SheetHeader>
      <div className="flex-1 space-y-5 px-5 py-4">
        <div
          className={cn("rounded-lg border p-3 text-sm leading-relaxed", tone)}
        >
          <div className="mb-1 text-[11px] uppercase tracking-wide opacity-70">
            What to do
          </div>
          {row.headline}
        </div>
        <MemberFacts row={row} />
        <div>
          <div className="mb-1 font-medium text-[11px] text-slate-900 uppercase tracking-wide">
            What Verify saw
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">{row.detail}</p>
        </div>
        <RerunBlock key={attempt} row={row} phase={phase} onDone={rerunDone} />
      </div>
      <div className="grid grid-cols-2 gap-2 border-t px-5 py-4">
        {exception && !resolved ? (
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => {
              onResolve(row.id);
              toast.success("Marked resolved", {
                description: `${row.mrn} leaves the exceptions list. The 06:10 result stays in the ledger.`,
              });
              onClose();
            }}
          >
            <CheckCircle2 className="size-4" /> Mark resolved
          </Button>
        ) : null}
        <Button
          variant="outline"
          onClick={() =>
            toast.success("Front-desk task created", {
              description: `${row.mrn} · ${row.headline}`,
            })
          }
        >
          <ClipboardList className="size-4" /> Create front-desk task
        </Button>
        <Button
          variant="outline"
          disabled={phase === "running"}
          onClick={() => {
            setPhase("running");
            setAttempt((n) => n + 1);
          }}
        >
          <RefreshCw
            className={cn("size-4", phase === "running" && "animate-spin")}
          />
          Rerun eligibility
        </Button>
        {row.authId ? (
          <Button asChild variant="outline">
            <Link href={`/demo/authorizations/${row.authId}`}>
              Open authorization <ArrowRight className="size-4" />
            </Link>
          </Button>
        ) : null}
      </div>
    </>
  );
}
