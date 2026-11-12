"use client";

import { ArrowRight, CircleCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/lib/core-ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/lib/core-ui/table";
import { fmtDate, money } from "@/lib/demo/format";
import { PAYER_BY_ID } from "@/lib/demo/payers";
import { EmptyState, PayerChip } from "@/lib/demo-ui/primitives";
import { Pill, StatusBadge } from "@/lib/demo-ui/status-badge";
import { cn } from "@/lib/tailwind-utils";
import {
  type AppealView,
  CHANNEL_LABEL,
  daysLeft,
  destinationFor,
  freeCareValue,
} from "./appeal-helpers";

const HEADERS = [
  "Member",
  "Payer",
  "Level",
  "Channel · destination",
  "Filed",
  "Receipt confirmed",
  "Decision due",
  "Free care",
  "Status",
  "Next step",
  "",
];

function Receipt({ a }: { a: AppealView }) {
  if (a.receiptConfirmedAt) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-700 text-xs">
        <CircleCheck className="size-3.5" /> {fmtDate(a.receiptConfirmedAt)}
      </span>
    );
  }
  if (a.filedAt) {
    return <Pill tone="amber">unconfirmed</Pill>;
  }
  return <span className="text-slate-400 text-xs">—</span>;
}

function Due({ a }: { a: AppealView }) {
  if (!a.decisionDueAt) {
    return <span className="text-slate-400 text-xs">—</span>;
  }
  const left = daysLeft(a.decisionDueAt);
  return (
    <div className="text-xs tabular-nums">
      <div className="text-slate-800">{fmtDate(a.decisionDueAt)}</div>
      <div
        className={cn(
          a.outcome
            ? "text-slate-400"
            : left <= 7
              ? "text-rose-600"
              : "text-slate-500",
        )}
      >
        {a.outcome
          ? "decided"
          : left >= 0
            ? `${left}d left`
            : `${-left}d overdue`}
      </div>
    </div>
  );
}

export function AppealsTable({ rows }: { rows: AppealView[] }) {
  const router = useRouter();
  if (rows.length === 0) {
    return (
      <div className="p-5">
        <EmptyState
          title="No appeals"
          body="Denials routed to appeal show up here."
        />
      </div>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {HEADERS.map((h) => (
            <TableHead key={h || "open"} className="whitespace-nowrap text-xs">
              {h}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((a) => {
          const payer = PAYER_BY_ID[a.payerId];
          const href = `/demo/appeals/${a.id}`;
          return (
            <TableRow
              key={a.id}
              onClick={() => router.push(href)}
              className={cn(
                "cursor-pointer hover:bg-slate-50",
                !a.outcome && "bg-white",
              )}
            >
              <TableCell className="font-medium text-slate-900">
                {a.mrn}
              </TableCell>
              <TableCell>
                <PayerChip color={payer.color} name={payer.short} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-slate-700 text-sm">
                {a.level}
              </TableCell>
              <TableCell className="text-xs">
                <div className="text-slate-800">{CHANNEL_LABEL[a.channel]}</div>
                <div className="text-slate-500">{destinationFor(a)}</div>
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs tabular-nums">
                {a.filedAt ? (
                  <span className="text-slate-800">{fmtDate(a.filedAt)}</span>
                ) : (
                  <span className="font-medium text-amber-700">not yet</span>
                )}
              </TableCell>
              <TableCell>
                <Receipt a={a} />
              </TableCell>
              <TableCell>
                <Due a={a} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs tabular-nums">
                <div className="text-slate-800">{a.freeCareDays} days</div>
                <div className={a.outcome ? "text-slate-400" : "text-rose-600"}>
                  {money(freeCareValue(a.freeCareDays))}
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge status={a.status} />
              </TableCell>
              <TableCell className="max-w-[220px] text-slate-600 text-xs">
                {a.nextStep}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link href={href}>
                    Open <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
