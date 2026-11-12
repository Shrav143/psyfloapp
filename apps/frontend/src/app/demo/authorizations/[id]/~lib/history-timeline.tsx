"use client";

import { Bot, Building2, Stethoscope, User } from "lucide-react";
import { fmtDate } from "@/lib/demo/format";
import type { Actor, Authorization } from "@/lib/demo/types";
import { Panel } from "@/lib/demo-ui/primitives";
import { Pill } from "@/lib/demo-ui/status-badge";
import { cn } from "@/lib/tailwind-utils";

const ACTOR: Record<
  Actor,
  {
    label: string;
    icon: typeof Bot;
    tone: "blue" | "green" | "slate" | "amber" | "violet";
  }
> = {
  agent: { label: "Agent", icon: Bot, tone: "blue" },
  clinician: { label: "Clinician", icon: Stethoscope, tone: "green" },
  staff: { label: "Staff", icon: User, tone: "slate" },
  payer: { label: "Payer", icon: Building2, tone: "amber" },
  system: { label: "System", icon: Bot, tone: "violet" },
};

export function HistoryTimeline({ auth }: { auth: Authorization }) {
  const events = [...auth.events].sort((a, b) => (a.at < b.at ? 1 : -1));
  const cuts = auth.versions.filter(
    (v) => v.decision === "partial" || v.decision === "denied",
  ).length;
  return (
    <Panel
      title="History that survives renewal"
      description={`${auth.versions.length} versions, ${events.length} events, nothing overwritten. A renewal appends; it never replaces.`}
      right={
        auth.story === "four-renewals" ? (
          <Pill tone="red">Cut {cuts} times in a row</Pill>
        ) : null
      }
      padded={false}
    >
      {auth.story === "four-renewals" ? (
        <div className="border-slate-100 border-b bg-rose-50/60 px-5 py-3 text-rose-900 text-sm">
          Sunwave shows only the rightmost box:{" "}
          <strong>30 units, active</strong>. Everything to the left — 60 → 45 →
          30 → denied → won on appeal — was deleted on each renewal. This payer
          has cut the request every single time.
        </div>
      ) : null}
      <div className="flex gap-3 overflow-x-auto px-5 py-4">
        {auth.versions.map((v) => (
          <div
            key={v.id}
            className={cn(
              "min-w-[150px] rounded-lg border p-3 text-xs",
              v.decision === "denied"
                ? "border-rose-200 bg-rose-50"
                : v.decision === "partial"
                  ? "border-amber-200 bg-amber-50"
                  : v.decision === "pending"
                    ? "border-blue-200 bg-blue-50"
                    : "border-emerald-200 bg-emerald-50",
            )}
          >
            <div className="font-medium text-slate-900">
              v{v.number} · {v.kind}
            </div>
            <div className="mt-1 text-slate-700">
              asked {v.unitsAsked} →{" "}
              {v.decision === "pending"
                ? "pending"
                : v.decision === "denied"
                  ? "denied"
                  : `${v.unitsGranted} granted`}
            </div>
            <div className="text-slate-500">
              {fmtDate(v.submittedAt)}
              {v.decidedAt ? ` → ${fmtDate(v.decidedAt)}` : ""}
            </div>
          </div>
        ))}
      </div>
      <ol className="divide-y divide-slate-100 border-slate-100 border-t">
        {events.map((e) => {
          const a = ACTOR[e.actor];
          const Icon = a.icon;
          return (
            <li key={e.id} className="flex gap-3 px-5 py-3">
              <div className="w-20 shrink-0 pt-0.5 text-slate-500 text-xs tabular-nums">
                {fmtDate(e.at, true)}
              </div>
              <div className="mt-0.5 shrink-0">
                <Icon className="size-4 text-slate-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900 text-sm">
                    {e.title}
                  </span>
                  <Pill tone={a.tone}>{a.label}</Pill>
                  {e.versionNumber ? (
                    <span className="text-[11px] text-slate-400">
                      v{e.versionNumber}
                    </span>
                  ) : null}
                </div>
                {e.detail ? (
                  <div className="mt-0.5 text-slate-600 text-xs">
                    {e.detail}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
