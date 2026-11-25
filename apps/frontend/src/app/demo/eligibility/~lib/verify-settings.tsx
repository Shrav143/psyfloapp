"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/lib/core-ui/button";
import { Switch } from "@/lib/core-ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/lib/core-ui/table";
import { PAYERS } from "@/lib/demo/payers";
import { Panel, PayerChip } from "@/lib/demo-ui/primitives";
import { Pill, StatusBadge } from "@/lib/demo-ui/status-badge";
import { CHECK_ITEMS } from "./check-items";
import type { EligRow } from "./elig-model";
import { sourceFor } from "./run-scripts";

function initialToggles(): Record<string, boolean> {
  return Object.fromEntries(CHECK_ITEMS.map((c) => [c.id, c.defaultOn]));
}

/** The "What Verify checks" tab: toggles per check, and where each answer comes from. */
export function VerifySettings({ rows }: { rows: EligRow[] }) {
  const [on, setOn] = useState<Record<string, boolean>>(initialToggles);
  const toggle = (id: string, label: string, next: boolean) => {
    setOn((s) => ({ ...s, [id]: next }));
    toast.success(
      next ? `Check enabled · ${label}` : `Check paused · ${label}`,
      {
        description:
          "Applies from tomorrow's 06:10 run. This morning's results are kept.",
      },
    );
  };
  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <Panel
        title="What Verify checks"
        description="Each check reads the 271 or the payer portal and, when it finds something, writes one action line for a person."
        padded={false}
      >
        <ul className="divide-y divide-slate-100">
          {CHECK_ITEMS.map((c) => {
            const found = rows.filter(c.matches).length;
            const enabled = on[c.id] ?? false;
            return (
              <li key={c.id} className="flex items-start gap-4 px-5 py-3">
                <Switch
                  checked={enabled}
                  onCheckedChange={(v) => toggle(c.id, c.label, v)}
                  className="mt-0.5 data-[state=checked]:bg-indigo-600"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-900 text-sm">
                    {c.label}
                  </div>
                  <div className="text-slate-500 text-xs">{c.detail}</div>
                </div>
                {enabled ? (
                  <Pill tone={found ? "amber" : "green"}>
                    {found ? `${found} flagged today` : "clear today"}
                  </Pill>
                ) : (
                  <Pill tone="slate">
                    {found ? `off · would flag ${found}` : "off"}
                  </Pill>
                )}
              </li>
            );
          })}
        </ul>
        <div className="border-slate-100 border-t px-5 py-3 text-slate-600 text-xs">
          Verify never edits coverage on the chart; it writes an action for a
          human.
        </div>
      </Panel>
      <Panel
        title="Sources"
        description="Where each payer's answer comes from."
        padded={false}
        right={
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              toast.success("All 6 sources responded", {
                description:
                  "Availity 1.1s · WellCare portal 3.4s · Novitas idle",
              })
            }
          >
            Test connections
          </Button>
        }
      >
        <Table className="[&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3">
          <TableHeader>
            <TableRow>
              <TableHead>Payer</TableHead>
              <TableHead>Auth channel</TableHead>
              <TableHead>Eligibility source</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {PAYERS.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <PayerChip color={p.color} name={p.short} />
                </TableCell>
                <TableCell className="text-slate-600 text-xs">
                  {p.authChannel}
                </TableCell>
                <TableCell className="text-slate-600 text-xs">
                  {sourceFor(p)}
                </TableCell>
                <TableCell>
                  <StatusBadge status="connected" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between gap-2 border-slate-100 border-t px-5 py-3 text-slate-600 text-xs">
          <span>Carelon Behavioral Health portal · carve-out payer</span>
          <StatusBadge status="credentials needed" />
        </div>
      </Panel>
    </div>
  );
}
