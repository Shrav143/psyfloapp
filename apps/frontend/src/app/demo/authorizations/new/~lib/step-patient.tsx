"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/lib/core-ui/select";
import { getDataset } from "@/lib/demo/dataset";
import { fmtDate } from "@/lib/demo/format";
import { PAYER_BY_ID } from "@/lib/demo/payers";
import { KV, Panel, PayerChip } from "@/lib/demo-ui/primitives";
import { Pill } from "@/lib/demo-ui/status-badge";
import { cn } from "@/lib/tailwind-utils";
import type { RequestContext, RequestKind, WizardState } from "./wizard-model";

const KINDS: RequestKind[] = ["initial", "renewal"];

function Attendance({ planned, actual }: { planned: number; actual: number }) {
  const tone =
    actual > planned ? "amber" : actual < planned * 0.7 ? "amber" : "green";
  const note =
    actual > planned
      ? "above plan"
      : actual < planned * 0.7
        ? "below plan"
        : "on plan";
  return (
    <span className="inline-flex items-center gap-2">
      planned {planned} · actual {actual}
      <Pill tone={tone}>{note}</Pill>
    </span>
  );
}

export function StepPatient({
  state,
  ctx,
  onSelectPatient,
  onKind,
}: {
  state: WizardState;
  ctx: RequestContext;
  onSelectPatient: (mrn: string) => void;
  onKind: (k: RequestKind) => void;
}) {
  const { patient, payer, auth, clocks, nextVersion } = ctx;
  const versions = auth?.versions.length ?? 0;
  return (
    <Panel
      title="Patient & service"
      description="Pick the patient. Payer, program and history come from the ledger, not from a form."
    >
      <div className="grid gap-5 md:grid-cols-[1fr_auto]">
        <div>
          <label
            htmlFor="patient"
            className="mb-1 block font-medium text-slate-700 text-xs"
          >
            Patient
          </label>
          <Select value={state.mrn} onValueChange={onSelectPatient}>
            <SelectTrigger id="patient" className="w-full bg-white">
              <SelectValue placeholder="Select a patient" />
            </SelectTrigger>
            <SelectContent>
              {getDataset().patients.map((p) => (
                <SelectItem key={p.mrn} value={p.mrn}>
                  {p.mrn} · {p.initials} · {PAYER_BY_ID[p.payerId].short}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="mb-1 font-medium text-slate-700 text-xs">
            Request kind
          </div>
          <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
            {KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => onKind(k)}
                className={cn(
                  "rounded px-3 py-1.5 font-medium text-xs capitalize transition-colors",
                  state.kind === k
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900",
                )}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      </div>
      <KV
        className="mt-5"
        items={[
          {
            k: "Payer",
            v: (
              <PayerChip
                color={payer.color}
                name={`${payer.name} · ${payer.kind === "mco" ? "Kentucky Medicaid MCO" : "Traditional Medicare"}`}
              />
            ),
          },
          { k: "Program", v: "TRP · H2020 · per diem" },
          {
            k: "Diagnosis",
            v: `${patient.diagnosisCode} · ${patient.diagnosisLabel}`,
          },
          {
            k: "Visits / week",
            v: (
              <Attendance
                planned={patient.plannedPerWeek}
                actual={patient.actualPerWeek}
              />
            ),
          },
          {
            k: "Intake",
            v: `${fmtDate(patient.intakeDate, true)} · ${patient.location === "lex" ? "Lexington" : "Hopkinsville"}`,
          },
          {
            k: "Dual-eligible",
            v: patient.dualEligible ? (
              <Pill tone="cyan">
                Yes · Medicare-first: Medicare must deny before Kentucky
                Medicaid pays
              </Pill>
            ) : (
              "No"
            ),
          },
          {
            k: "Guardian",
            v: patient.hasGuardian ? "Yes · consent on file" : "No",
          },
          { k: "Care home", v: patient.primaryCareHome },
        ]}
      />
      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="font-medium text-slate-900">
          {clocks
            ? `Current authorization: v${clocks.version.number}, ${clocks.unitsUsed}/${clocks.version.unitsGranted} units used, window ends ${fmtDate(clocks.windowEnd, true)}`
            : auth
              ? `No decided authorization yet · ${auth.nextAction}`
              : "No authorization on file. This will be the first request in the ledger."}
        </div>
        <div className="mt-1 text-slate-600 text-xs">
          History: {versions} prior versions (kept)
        </div>
        {auth ? (
          <div className="mt-1 text-slate-600 text-xs">
            {state.kind === "renewal"
              ? `Renewal appends v${nextVersion}; v1–v${versions} stay in the ledger unchanged.`
              : `An initial request on a patient with history still appends as v${nextVersion}. Nothing is overwritten.`}
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
