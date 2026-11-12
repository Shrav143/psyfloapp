"use client";

import { FileText } from "lucide-react";
import type { Payer } from "@/lib/demo/types";
import { Pill } from "@/lib/demo-ui/status-badge";
import { RULE_DOCS, RULE_NOTES } from "./rule-tuple";

export function RuleTupleCard({ payer }: { payer: Payer }) {
  const notes = RULE_NOTES[payer.id];
  const deviations = RULE_DOCS.filter((d) => d.variants?.[payer.id]).length;
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] text-slate-500 uppercase tracking-wide">
            Rule tuple
          </div>
          <div className="font-semibold text-slate-900 text-sm">
            {payer.short} × TRP (H2020) × Kentucky Medicaid
          </div>
        </div>
        {payer.criteriaSet === "unconfirmed" ? (
          <Pill tone="amber">unconfirmed — ask</Pill>
        ) : (
          <Pill tone="slate">{payer.criteriaSet}</Pill>
        )}
      </div>
      <div className="mt-1 text-slate-500 text-xs">
        {RULE_DOCS.length} required documents · {deviations}{" "}
        {deviations === 1 ? "deviation" : "deviations"} observed for this payer
        (amber)
      </div>
      <ul className="mt-3 space-y-2">
        {RULE_DOCS.map((d) => {
          const variant = d.variants?.[payer.id];
          return (
            <li key={d.name} className="flex items-start gap-2 text-sm">
              <FileText className="mt-0.5 size-4 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <div className="text-slate-800">{d.name}</div>
                <div className="text-slate-500 text-xs">{d.base}</div>
                {variant ? (
                  <div className="text-amber-700 text-xs">
                    {payer.short}: {variant}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {notes.length ? (
        <div className="mt-3 border-slate-200 border-t pt-3">
          <div className="text-[11px] text-slate-500 uppercase tracking-wide">
            Payer-specific notes
          </div>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700 text-xs">
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
