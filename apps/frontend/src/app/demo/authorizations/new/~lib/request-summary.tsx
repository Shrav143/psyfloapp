"use client";

import { fmtDate, money, VISIT_RATE } from "@/lib/demo/format";
import { KV, Panel, PayerChip } from "@/lib/demo-ui/primitives";
import { Pill } from "@/lib/demo-ui/status-badge";
import { packetCounts } from "./packet-model";
import {
  channelLabel,
  kindLabel,
  type RequestContext,
  type WizardState,
} from "./wizard-model";

export function RequestSummary({
  state,
  ctx,
}: {
  state: WizardState;
  ctx: RequestContext;
}) {
  const { patient, payer, docs, windowEnd, nextVersion } = ctx;
  const counts = packetCounts(docs, state.requested);
  const signoff = state.submission ? (
    <Pill tone="blue">Submitted · {state.submission.reference}</Pill>
  ) : state.signature ? (
    <Pill tone="green">Signed · {state.signature.by}</Pill>
  ) : (
    <Pill tone="slate">Not signed</Pill>
  );
  return (
    <div className="xl:sticky xl:top-6">
      <Panel
        title="Request summary"
        description="Updates as you go. Nothing leaves until step 4 is signed."
      >
        <KV
          items={[
            { k: "Patient", v: `${patient.mrn} · ${patient.initials}` },
            {
              k: "Payer",
              v: <PayerChip color={payer.color} name={payer.short} />,
            },
            { k: "Service", v: "H2020 · TRP · per diem" },
            { k: "Kind", v: kindLabel(state.kind, nextVersion) },
            {
              k: "Units",
              v: `${state.units} requested${payer.unitCap ? ` · cap ${payer.unitCap}` : ""}`,
            },
            {
              k: "Window",
              v: `${fmtDate(state.windowStart)} → ${fmtDate(windowEnd, true)}`,
            },
            {
              k: "Documents",
              v: `${counts.attached} of ${counts.total} attached${counts.gaps.length ? ` · ${counts.gaps.length} gaps` : ""}`,
            },
            { k: "Channel", v: channelLabel(payer) },
            { k: "Sign-off", v: signoff },
          ]}
        />
        <div className="mt-4 border-slate-100 border-t pt-3 text-slate-500 text-xs">
          Worth {money(state.units * VISIT_RATE)} at{" "}
          {money(VISIT_RATE, { cents: true })} per visit day if granted in full.
          {patient.dualEligible
            ? " Dual-eligible: Medicare must deny before Kentucky Medicaid pays."
            : ""}
        </div>
      </Panel>
    </div>
  );
}
