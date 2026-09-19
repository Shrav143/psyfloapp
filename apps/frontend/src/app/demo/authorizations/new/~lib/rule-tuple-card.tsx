"use client";

import type { Payer } from "@/lib/demo/types";
import { KV, Panel } from "@/lib/demo-ui/primitives";
import { Pill } from "@/lib/demo-ui/status-badge";

export function RuleTupleCard({ payer }: { payer: Payer }) {
  const plan =
    payer.kind === "mco" ? "Kentucky Medicaid" : "Traditional Medicare";
  return (
    <Panel
      title={`${payer.short} × TRP (H2020) × ${plan}`}
      description="The rule tuple this request is filed under. Sentinel diffs it against payer bulletins weekly."
    >
      <KV
        items={[
          {
            k: "Unit cap",
            v: payer.unitCap
              ? `${payer.unitCap} units per authorization`
              : "None published",
          },
          { k: "Typical window", v: `${payer.typicalWindowDays} days` },
          {
            k: "Auth channel",
            v: `${payer.authChannel} · ${payer.authPortal}`,
          },
          {
            k: "Decision SLA",
            v: `${payer.decisionSlaDays}-day rule · ${payer.short} median ${payer.medianDecisionDays} days`,
          },
          {
            k: "Packet split",
            v:
              payer.packetSplit === "three-part"
                ? "Three separate uploads: assessments · external records · cover sheet"
                : "Single upload",
          },
          {
            k: "Criteria set",
            v:
              payer.criteriaSet === "unconfirmed" ? (
                <Pill tone="amber">unconfirmed · ask provider relations</Pill>
              ) : (
                payer.criteriaSet
              ),
          },
          {
            k: "Appeal channel",
            v: `${payer.appealChannel}${payer.appealFax ? ` · ${payer.appealFax}` : ""} · ${payer.appealDeadlineDays}-day window`,
          },
        ]}
      />
      {payer.notes.length ? (
        <ul className="mt-4 space-y-1 border-slate-100 border-t pt-3 text-slate-600 text-xs">
          {payer.notes.map((n) => (
            <li key={n}>· {n}</li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}
