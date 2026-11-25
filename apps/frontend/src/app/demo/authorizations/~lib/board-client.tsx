"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/lib/core-ui/button";
import { getDataset, visitDatesFor } from "@/lib/demo/dataset";
import { money } from "@/lib/demo/format";
import { MCO_IDS, PAYER_BY_ID } from "@/lib/demo/payers";
import { useDemoStore } from "@/lib/demo/store";
import type { AuthStatus, PayerId } from "@/lib/demo/types";
import { PageHeader } from "@/lib/demo-ui/primitives";
import { cn } from "@/lib/tailwind-utils";
import { LIFECYCLE, toRow } from "./board-model";
import { BoardTable } from "./board-table";

export function BoardClient() {
  const params = useSearchParams();
  const router = useRouter();
  const location = useDemoStore((s) => s.location);
  const queued = useDemoStore((s) => s.signoffQueue);
  const ds = getDataset();
  const statusParam = params.get("status") as AuthStatus | null;
  const view = params.get("view");
  const [payer, setPayer] = useState<PayerId | "all">("all");
  const [status, setStatus] = useState<AuthStatus | "all">(
    statusParam ?? "all",
  );
  const [needsMe, setNeedsMe] = useState(view === "signoff");

  const rows = useMemo(() => {
    return ds.authorizations
      .map((a) => {
        const p = ds.patients.find((x) => x.mrn === a.mrn);
        if (!p) {
          return undefined;
        }
        const row = toRow(a, p, visitDatesFor(p.mrn));
        if (queued.includes(a.id) && row.auth.status !== "awaiting_signoff") {
          row.auth = {
            ...row.auth,
            status: "awaiting_signoff",
            nextAction: "Renewal packet queued for signature",
          };
          row.needsMe = true;
        }
        return row;
      })
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .filter((r) => location === "both" || r.patient.location === location)
      .filter((r) => payer === "all" || r.auth.payerId === payer)
      .filter((r) => status === "all" || r.auth.status === status)
      .filter((r) => !needsMe || r.needsMe)
      .sort((a, b) => b.daysInState - a.daysInState);
  }, [ds, location, payer, status, needsMe, queued]);

  const counts = LIFECYCLE.map((l) => {
    const inState = ds.authorizations.filter(
      (a) =>
        a.status === l.status ||
        (l.status === "awaiting_signoff" && queued.includes(a.id)),
    );
    return {
      ...l,
      n: inState.length,
      value: inState.reduce(
        (n, a) =>
          n + (a.versions[a.versions.length - 1]?.unitsAsked ?? 0) * 244.29,
        0,
      ),
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Authorization board"
        description="Every request, every status, both sites, all five MCOs and Medicare — the five-tab spreadsheet in one view. Partial is its own state, not a flavour of approved. Sorted by days in current state so anything stuck floats up."
        actions={
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
            <Link href="/demo/authorizations/new">
              <Plus className="size-4" /> New request
            </Link>
          </Button>
        }
      />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {counts.map((c) => (
          <button
            key={c.status}
            type="button"
            onClick={() => {
              setStatus(status === c.status ? "all" : c.status);
              setNeedsMe(false);
              router.replace("/demo/authorizations");
            }}
            className={cn(
              "min-w-[124px] rounded-xl border bg-white px-3 py-2 text-left shadow-sm transition-colors hover:border-indigo-300",
              status === c.status
                ? "border-indigo-500 ring-2 ring-indigo-100"
                : "border-slate-200",
            )}
          >
            <div className="text-[11px] text-slate-500 uppercase tracking-wide">
              {c.label}
            </div>
            <div className="font-semibold text-lg text-slate-900">{c.n}</div>
            <div className="text-[11px] text-slate-400">
              {money(c.value)} asked
            </div>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setNeedsMe((v) => !v)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs",
            needsMe
              ? "border-violet-600 bg-violet-600 text-white"
              : "border-slate-200 bg-white text-slate-700",
          )}
        >
          Needs me today
        </button>
        <button
          type="button"
          onClick={() => setPayer("all")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs",
            payer === "all"
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-200 bg-white text-slate-700",
          )}
        >
          All payers
        </button>
        {[...MCO_IDS, "medicare" as PayerId].map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setPayer(payer === id ? "all" : id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
              payer === id
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700",
            )}
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: PAYER_BY_ID[id].color }}
            />
            {PAYER_BY_ID[id].short}
          </button>
        ))}
        <span className="ml-auto text-slate-500 text-xs">
          {rows.length} requests
        </span>
      </div>
      <BoardTable rows={rows} />
    </div>
  );
}
