"use client";

import { DENIAL_CATEGORY_LABEL, denialMix } from "@/lib/demo/analytics";
import { PAYER_BY_ID } from "@/lib/demo/payers";
import type { DenialCategory, PayerId } from "@/lib/demo/types";
import { Panel } from "@/lib/demo-ui/primitives";

const CATEGORIES = Object.keys(DENIAL_CATEGORY_LABEL) as DenialCategory[];

const SHORT: Record<DenialCategory, string> = {
  medical_necessity: "Med. necessity",
  documentation: "Documentation",
  missing_element: "Missing element",
  eligibility: "Eligibility",
  policy_change: "Policy change",
  no_reason: "No reason",
};

function cellStyle(n: number, max: number) {
  if (n === 0) {
    return { backgroundColor: "#f8fafc", color: "#cbd5e1" };
  }
  const alpha = 0.12 + 0.78 * (n / max);
  return {
    backgroundColor: `rgba(225, 29, 72, ${alpha.toFixed(2)})`,
    color: alpha > 0.5 ? "#ffffff" : "#881337",
  };
}

export function DenialHeatmap() {
  const mix = denialMix();
  const max = Math.max(
    1,
    ...mix.flatMap((row) => CATEGORIES.map((c) => Number(row[c]))),
  );
  const colTotal = (c: DenialCategory) =>
    mix.reduce((n, row) => n + Number(row[c]), 0);
  const rowTotal = (row: Record<string, number | string>) =>
    CATEGORIES.reduce((n, c) => n + Number(row[c]), 0);
  const grid = { gridTemplateColumns: "132px repeat(6, minmax(0, 1fr)) 48px" };
  return (
    <Panel
      title="Where denials come from"
      description="Payer × reason category, all denials on the ledger. Darker cells are the patterns worth a prevention rule."
    >
      <div className="grid gap-1 text-xs" style={grid}>
        <div />
        {CATEGORIES.map((c) => (
          <div
            key={c}
            className="truncate px-1 pb-1 text-center text-[11px] text-slate-500"
            title={DENIAL_CATEGORY_LABEL[c]}
          >
            {SHORT[c]}
          </div>
        ))}
        <div className="pb-1 text-right text-[11px] text-slate-500">All</div>
        {mix.map((row) => {
          const payer = PAYER_BY_ID[row["payerId"] as PayerId];
          return (
            <div key={payer.id} className="contents">
              <div className="flex items-center gap-1.5 pr-2 text-slate-700">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: payer.color }}
                />
                <span className="truncate">{payer.short}</span>
              </div>
              {CATEGORIES.map((c) => {
                const n = Number(row[c]);
                return (
                  <div
                    key={c}
                    className="flex h-9 items-center justify-center rounded-md font-medium tabular-nums"
                    style={cellStyle(n, max)}
                    title={`${payer.short} · ${DENIAL_CATEGORY_LABEL[c]} · ${n}`}
                  >
                    {n}
                  </div>
                );
              })}
              <div className="flex h-9 items-center justify-end pr-1 font-medium text-slate-700 tabular-nums">
                {rowTotal(row)}
              </div>
            </div>
          );
        })}
        <div className="pt-1 text-slate-500">All payers</div>
        {CATEGORIES.map((c) => (
          <div
            key={c}
            className="pt-1 text-center font-medium text-slate-700 tabular-nums"
          >
            {colTotal(c)}
          </div>
        ))}
        <div className="pt-1 text-right font-semibold text-slate-900 tabular-nums">
          {mix.reduce((n, row) => n + rowTotal(row), 0)}
        </div>
      </div>
      <p className="mt-4 text-slate-600 text-xs leading-relaxed">
        Medical necessity dominates at Aetna and Humana and almost always looks
        invalid against LOCUS / MCG: the packet met the criteria, the reviewer
        did not find it. Anthem's denials are administrative (missing element,
        eligibility) and preventable at packet time. Passport and WellCare send
        notices with no reason; the Caller agent phones for the criteria.
      </p>
    </Panel>
  );
}
