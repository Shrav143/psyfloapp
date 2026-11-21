"use client";

import { PenLine, ShieldCheck, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/lib/core-ui/button";
import { Checkbox } from "@/lib/core-ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/lib/core-ui/select";
import { DEMO_TODAY, fmtDate } from "@/lib/demo/format";
import { useDemoStore } from "@/lib/demo/store";
import { KV, Panel } from "@/lib/demo-ui/primitives";
import { packetCounts } from "./packet-model";
import {
  COORDINATOR,
  channelLabel,
  clockTime,
  kindLabel,
  ledgerId,
  SIGNERS,
  type StepProps,
} from "./wizard-model";

export function StepSignoff({ state, ctx, patch }: StepProps) {
  const { patient, payer, docs, windowEnd, nextVersion } = ctx;
  const markSigned = useDemoStore((s) => s.markSigned);
  const counts = packetCounts(docs, state.requested);
  const signed = state.signature;
  const sign = () => {
    const signature = {
      by: state.signer,
      at: `${fmtDate(DEMO_TODAY, true)} ${clockTime()}`,
    };
    markSigned(ledgerId(ctx));
    patch({ signature });
    toast.success("Signed · queued for Navigator", {
      description: `${signature.by} · ${state.units} units · ${counts.attached} of ${counts.total} documents`,
    });
  };
  const sendBack = () => {
    patch({ approved: false });
    toast(`Sent back to ${COORDINATOR}`, {
      description:
        "Request returned to the coordinator with a note. Nothing was submitted.",
    });
  };
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-violet-600" />
        <div>
          <span className="font-medium">The gate.</span> Nothing is submitted
          without this step. Agents draft and file; clinicians decide.
        </div>
      </div>
      <Panel
        title="What will be sent"
        description={`To ${payer.name} via ${channelLabel(payer)} · ${payer.packetSplit === "three-part" ? "three separate uploads" : "single upload"}`}
      >
        <KV
          items={[
            {
              k: "Patient",
              v: `${patient.mrn} · ${patient.initials} · ${patient.diagnosisCode}`,
            },
            {
              k: "Service",
              v: "H2020 · Therapeutic rehabilitation program · per diem",
            },
            { k: "Request", v: kindLabel(state.kind, nextVersion) },
            {
              k: "Units",
              v: `${state.units}${payer.unitCap ? ` · payer cap ${payer.unitCap}` : ""}`,
            },
            {
              k: "Window",
              v: `${fmtDate(state.windowStart, true)} → ${fmtDate(windowEnd, true)}`,
            },
            {
              k: "Documents",
              v: `${counts.attached} of ${counts.total} attached`,
            },
          ]}
        />
        {counts.gaps.length ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 text-xs">
            <div className="font-medium">
              {counts.gaps.length} open gaps travel with the packet as a note
            </div>
            <div className="mt-0.5">
              {counts.gaps.map((g) => `${g.name} (${g.status})`).join(" · ")}.
              You can sign anyway; the ledger records what was sent.
            </div>
          </div>
        ) : null}
      </Panel>
      <Panel
        title="Clinician sign-off"
        description="A signature is an event in the ledger. It is never overwritten."
      >
        <label htmlFor="approve" className="flex items-start gap-3">
          <Checkbox
            id="approve"
            checked={state.approved}
            disabled={Boolean(signed)}
            onCheckedChange={(v) => patch({ approved: v === true })}
            className="mt-0.5 data-[state=checked]:border-indigo-600 data-[state=checked]:bg-indigo-600"
          />
          <span className="text-slate-800 text-sm">
            I have reviewed this request and the attached documentation and
            approve it for submission.
          </span>
        </label>
        <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div>
            <label
              htmlFor="signer"
              className="mb-1 block font-medium text-slate-700 text-xs"
            >
              Signer
            </label>
            <Select
              value={state.signer}
              onValueChange={(v) => patch({ signer: v })}
              disabled={Boolean(signed)}
            >
              <SelectTrigger id="signer" className="w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIGNERS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={Boolean(signed)}
              onClick={sendBack}
            >
              <Undo2 className="size-4" /> Send back to coordinator
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={!state.approved || Boolean(signed)}
              onClick={sign}
            >
              <PenLine className="size-4" /> {signed ? "Signed" : "Sign"}
            </Button>
          </div>
        </div>
        {signed ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 text-sm">
            Signed by <span className="font-medium">{signed.by}</span> ·{" "}
            {signed.at} · queued for Navigator. Continue to submit.
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
