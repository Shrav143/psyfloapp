"use client";

import { FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/lib/core-ui/button";
import type { Clocks } from "@/lib/demo/derive";
import { fmtDate, money } from "@/lib/demo/format";
import { PAYER_BY_ID } from "@/lib/demo/payers";
import { POLICY_CHANGES } from "@/lib/demo/policy-changes";
import type { Authorization, Patient } from "@/lib/demo/types";
import { KV, Panel } from "@/lib/demo-ui/primitives";
import { Pill } from "@/lib/demo-ui/status-badge";

export function SidePanel({
  auth,
  patient,
  clocks,
}: {
  auth: Authorization;
  patient: Patient;
  clocks?: Clocks;
}) {
  const payer = PAYER_BY_ID[auth.payerId];
  const version = clocks?.version ?? auth.versions[auth.versions.length - 1];
  const docs = version?.packet ?? [];
  const changes = POLICY_CHANGES.filter(
    (c) => c.payerId === auth.payerId && !c.acknowledged,
  );
  return (
    <div className="space-y-6">
      <Panel title="Payer and service">
        <KV
          items={[
            { k: "Payer", v: payer.name },
            {
              k: "Plan",
              v:
                payer.kind === "mco"
                  ? "Kentucky Medicaid MCO"
                  : "Traditional Medicare",
            },
            { k: "Service", v: "H2020 · TRP · per diem" },
            { k: "Rate", v: `${money(244.29, { cents: true })} per visit day` },
            { k: "Auth channel", v: payer.authChannel },
            {
              k: "Appeals",
              v: `${payer.appealChannel}${payer.appealFax ? ` · ${payer.appealFax}` : ""} · ${payer.appealDeadlineDays}-day window`,
            },
            {
              k: "Unit cap",
              v: payer.unitCap
                ? `${payer.unitCap} per ${payer.typicalWindowDays}-day window`
                : "None published",
            },
            {
              k: "Criteria set",
              v:
                payer.criteriaSet === "unconfirmed" ? (
                  <Pill tone="amber">unconfirmed — ask</Pill>
                ) : (
                  payer.criteriaSet
                ),
            },
            {
              k: "Packet split",
              v:
                payer.packetSplit === "three-part"
                  ? "Three separate uploads"
                  : "Single upload",
            },
            {
              k: "Dual-eligible",
              v: patient.dualEligible ? (
                <Pill tone="cyan">Yes · Medicare must deny first</Pill>
              ) : (
                "No"
              ),
            },
            {
              k: "Guardian",
              v: patient.hasGuardian ? "Yes · consent on file" : "No",
            },
            { k: "Primary care home", v: patient.primaryCareHome },
          ]}
        />
        {patient.dualEligible ? (
          <div className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-cyan-900 text-xs">
            Medicare rejection pending 14 days. Medicaid billing is blocked
            behind it; timely-filing clock is running.
          </div>
        ) : null}
        {changes.length ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 text-xs">
            <div className="font-medium">
              Policy change not yet acknowledged
            </div>
            {changes.map((c) => (
              <div key={c.id}>
                {c.title} · effective {fmtDate(c.effectiveDate)}
              </div>
            ))}
          </div>
        ) : null}
      </Panel>
      <Panel
        title={
          version ? `Current version · v${version.number}` : "Current version"
        }
        description={
          version
            ? `Ref ${version.reference} · signed by ${version.signedBy ?? "—"} · via ${version.channel}`
            : undefined
        }
        right={
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              toast.success("Packet exported", {
                description: "Sunwave form package (PDF) · demo",
              })
            }
          >
            Export
          </Button>
        }
      >
        {docs.length ? (
          <ul className="space-y-1.5">
            {docs.map((d) => (
              <li key={d.name} className="flex items-center gap-2 text-sm">
                <FileText className="size-4 text-slate-400" />
                <span className="flex-1 text-slate-800">{d.name}</span>
                {d.status === "missing" ? (
                  <Pill tone="red">missing</Pill>
                ) : d.status === "stale" ? (
                  <Pill tone="amber">stale</Pill>
                ) : (
                  <span className="text-slate-400 text-xs">
                    {d.updatedAt ? fmtDate(d.updatedAt) : ""}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-slate-500 text-sm">
            Packet inherits the prior version's documents.
          </div>
        )}
      </Panel>
      <Panel
        title="What Sunwave shows for this patient"
        description="For contrast."
      >
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Prior auth required</span>
            <span className="size-3 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-slate-500">Auth #</span>
            <span className="text-slate-800">{version?.reference}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-slate-500">Units</span>
            <span className="text-slate-800">{version?.unitsGranted}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            No history, no clocks, no attendance, no partial state. Green or
            red.
          </div>
        </div>
      </Panel>
    </div>
  );
}
