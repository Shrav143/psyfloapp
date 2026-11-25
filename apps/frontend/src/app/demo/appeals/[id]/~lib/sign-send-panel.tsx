"use client";

import { CircleCheck, CircleDashed, Send, Signature } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/lib/core-ui/button";
import { Checkbox } from "@/lib/core-ui/checkbox";
import { Progress } from "@/lib/core-ui/progress";
import type { Appeal, AppealDoc } from "@/lib/demo/appeals";
import { fmtDate } from "@/lib/demo/format";
import { useDemoStore } from "@/lib/demo/store";
import { LiveRun } from "@/lib/demo-ui/agent-run";
import { Panel } from "@/lib/demo-ui/primitives";
import { cn } from "@/lib/tailwind-utils";
import {
  CHANNEL_LABEL,
  daysLeft,
  RECEIPT_CALL_AT,
} from "../../~lib/appeal-helpers";
import { CLINICIAN, sendScript } from "./workspace-helpers";

export function SignSendPanel({
  appeal,
  docs,
  pages,
  destination,
  signed,
  submitted,
  lettersReviewed,
}: {
  appeal: Appeal;
  docs: AppealDoc[];
  pages: number;
  destination: string;
  signed: boolean;
  submitted: boolean;
  lettersReviewed: boolean;
}) {
  const markSigned = useDemoStore((s) => s.markSigned);
  const markSubmitted = useDemoStore((s) => s.markSubmitted);
  const [reviewed, setReviewed] = useState(false);
  const [sending, setSending] = useState(false);
  const script = useMemo(
    () => sendScript(appeal, pages, destination),
    [appeal, pages, destination],
  );
  const onDone = useCallback(() => {
    markSubmitted(appeal.id);
    toast.success(`Sent · receipt call scheduled ${RECEIPT_CALL_AT}`, {
      description: `${pages} pages to ${destination} · transmission report saved to the appeal`,
    });
  }, [markSubmitted, appeal.id, pages, destination]);

  const missing = docs.filter((d) => d.status === "missing").length;
  const left = daysLeft(appeal.deadline);
  const checks = [
    {
      label: `All documents ready · ${docs.length - missing} of ${docs.length}`,
      ok: missing === 0,
    },
    {
      label: lettersReviewed
        ? "Letters reviewed"
        : "Letters reviewed · open both letter tabs",
      ok: lettersReviewed,
    },
    {
      label:
        left >= 0
          ? `Within deadline · ${left} days left`
          : `Deadline passed ${-left} days ago`,
      ok: left >= 0,
    },
  ];
  const channel = CHANNEL_LABEL[appeal.channel].toLowerCase();

  return (
    <Panel
      title="Sign & send"
      description="Nothing leaves without a clinician's signature. Agents draft, check, send and track."
    >
      <ul className="space-y-1.5">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-2 text-sm">
            {c.ok ? (
              <CircleCheck className="size-4 text-emerald-500" />
            ) : (
              <CircleDashed className="size-4 text-amber-500" />
            )}
            <span className={c.ok ? "text-slate-800" : "text-amber-800"}>
              {c.label}
            </span>
          </li>
        ))}
      </ul>
      <Progress
        value={((docs.length - missing) / docs.length) * 100}
        className="mt-3 h-1.5"
      />
      <div className="mt-4 space-y-3">
        {signed ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900 text-sm">
            <Signature className="size-4" />
            Signed by {CLINICIAN} ·{" "}
            {appeal.filedAt ? fmtDate(appeal.filedAt, true) : "today 10:42"}
          </div>
        ) : (
          <>
            <label className="flex cursor-pointer items-start gap-2 text-slate-700 text-sm">
              <Checkbox
                checked={reviewed}
                onCheckedChange={(v) => setReviewed(v === true)}
                className="mt-0.5 data-[state=checked]:border-indigo-600 data-[state=checked]:bg-indigo-600"
              />
              I have reviewed the packet as the treating clinician
            </label>
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={!reviewed}
              onClick={() => {
                markSigned(appeal.id);
                toast.success(`Signed as ${CLINICIAN}`, {
                  description:
                    "Signature and timestamp appended to the appeal history · the appeal letter is now ready",
                });
              }}
            >
              <Signature className="size-4" /> Sign as {CLINICIAN}
            </Button>
          </>
        )}
        {signed && !submitted && !sending ? (
          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            onClick={() => setSending(true)}
          >
            <Send className="size-4" /> Send by {channel} · {pages} pages
          </Button>
        ) : null}
        {sending && !appeal.filedAt ? (
          <div
            className={cn(
              "rounded-lg border p-3",
              submitted
                ? "border-emerald-200 bg-emerald-50/60"
                : "border-indigo-100 bg-indigo-50/40",
            )}
          >
            <div className="mb-2 font-medium text-slate-900 text-xs">
              {submitted ? "Sent" : "Sending…"}
            </div>
            <LiveRun script={script} running={sending} onDone={onDone} />
          </div>
        ) : null}
        {submitted ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <Send className="size-4" /> Sent by {channel} ·{" "}
              {appeal.filedAt ? fmtDate(appeal.filedAt, true) : "today"}
            </div>
            <div className="mt-0.5 text-emerald-800 text-xs">
              {pages} pages to {destination} ·{" "}
              {appeal.receiptConfirmedAt
                ? `receipt confirmed ${fmtDate(appeal.receiptConfirmedAt, true)}`
                : `receipt call scheduled ${RECEIPT_CALL_AT}`}
            </div>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
