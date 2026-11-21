"use client";

import { CheckCircle2, Compass, Database, Radar, Send } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/lib/core-ui/button";
import { type RunStep, SUBMISSION_SCRIPT } from "@/lib/demo/agents";
import { addDays, DEMO_TODAY, fmtDate } from "@/lib/demo/format";
import { useDemoStore } from "@/lib/demo/store";
import { LiveRun, RunSteps } from "@/lib/demo-ui/agent-run";
import { Panel } from "@/lib/demo-ui/primitives";
import { StatusBadge } from "@/lib/demo-ui/status-badge";
import { packetCounts } from "./packet-model";
import {
  channelLabel,
  ledgerId,
  referenceFor,
  type StepProps,
} from "./wizard-model";

export function StepSubmit({ state, ctx, patch }: StepProps) {
  const { patient, payer, auth, docs } = ctx;
  const markSubmitted = useDemoStore((s) => s.markSubmitted);
  const [running, setRunning] = useState(false);
  const channel = channelLabel(payer);
  const counts = packetCounts(docs, state.requested);
  const signedBy = state.signature?.by ?? "clinician";
  const script = useMemo<RunStep[]>(
    () =>
      SUBMISSION_SCRIPT.map((s, i) => {
        if (i === 0) {
          return {
            ...s,
            detail: `Signed by ${signedBy} · ${counts.attached} of ${counts.total} documents`,
          };
        }
        if (i === 1 && channel !== "Availity") {
          return {
            ...s,
            label: `Open ${channel} with the Harbor service account`,
          };
        }
        return s;
      }),
    [signedBy, counts.attached, counts.total, channel],
  );
  const finishRef = useRef<() => void>(() => undefined);
  finishRef.current = () => {
    if (state.submission) {
      return;
    }
    const submission = {
      reference: referenceFor(payer),
      at: DEMO_TODAY,
      due: addDays(DEMO_TODAY, payer.decisionSlaDays),
    };
    markSubmitted(ledgerId(ctx));
    patch({ submission });
    toast.success(`Submitted via ${channel}`, {
      description: `Reference ${submission.reference} · decision due ${fmtDate(submission.due, true)}`,
    });
  };
  const onDone = useCallback(() => finishRef.current(), []);
  const submission = state.submission;
  return (
    <div className="space-y-6">
      <Panel
        title="Submit & track"
        description={`Navigator files the signed packet in ${channel}, captures the reference and polls daily until decided.`}
      >
        {submission || running ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm">
              <Compass className="size-4 text-indigo-500" />
              <span className="font-medium text-indigo-600">Navigator</span>
              <span className="text-slate-500">
                · submission · {patient.mrn}
              </span>
              <StatusBadge
                status={submission ? "completed" : "running"}
                className="ml-auto"
              />
            </div>
            {submission ? (
              <RunSteps steps={script.map((s) => ({ ...s, state: "done" }))} />
            ) : (
              <LiveRun script={script} running={running} onDone={onDone} />
            )}
          </div>
        ) : (
          <div>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={!state.signature}
              onClick={() => setRunning(true)}
            >
              <Send className="size-4" /> Submit via {channel}
            </Button>
            <p className="mt-2 text-slate-500 text-xs">
              Navigator files only what step 4 signed.
            </p>
          </div>
        )}
      </Panel>
      {submission ? (
        <Panel
          title="Filed"
          description={`${payer.name} · ${channel}`}
          right={<StatusBadge status="submitted" />}
        >
          <div className="font-semibold text-2xl text-slate-900 tabular-nums tracking-tight">
            {submission.reference}
          </div>
          <ul className="mt-3 space-y-2 text-slate-700 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
              Submitted {fmtDate(submission.at, true)} · {payer.decisionSlaDays}
              -day rule clock started · decision due{" "}
              {fmtDate(submission.due, true)}
            </li>
            <li className="flex items-start gap-2">
              <Radar className="mt-0.5 size-4 shrink-0 text-indigo-500" />{" "}
              Status polling scheduled daily
            </li>
            <li className="flex items-start gap-2">
              <Database className="mt-0.5 size-4 shrink-0 text-slate-400" />{" "}
              Written back to Sunwave: reference and dates
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
              <Link
                href={
                  auth
                    ? `/demo/authorizations/${auth.id}`
                    : "/demo/authorizations"
                }
              >
                Open authorization
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/demo/authorizations">Back to board</Link>
            </Button>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
