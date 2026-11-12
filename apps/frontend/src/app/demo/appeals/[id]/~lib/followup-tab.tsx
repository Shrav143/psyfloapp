"use client";

import { Bot, Headset, PhoneCall, Voicemail } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/lib/core-ui/button";
import type { Appeal } from "@/lib/demo/appeals";
import { fmtDate } from "@/lib/demo/format";
import { LiveRun } from "@/lib/demo-ui/agent-run";
import { Pill } from "@/lib/demo-ui/status-badge";
import { cn } from "@/lib/tailwind-utils";
import { RECEIPT_CALL_AT } from "../../~lib/appeal-helpers";
import { CALL_SCRIPT, liveTranscript } from "./workspace-helpers";

type Line = { who: string; text: string };

function Bubble({ line }: { line: Line }) {
  const agent = line.who === "Agent";
  const ivr = line.who === "IVR";
  const Icon = agent ? Bot : ivr ? Voicemail : Headset;
  return (
    <div className={cn("flex items-end gap-2", agent && "flex-row-reverse")}>
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full",
          agent
            ? "bg-indigo-100 text-indigo-700"
            : ivr
              ? "bg-slate-200 text-slate-600"
              : "bg-amber-100 text-amber-800",
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div
        className={cn(
          "max-w-[80%] rounded-xl px-3 py-2 text-sm",
          agent
            ? "bg-indigo-600 text-white"
            : ivr
              ? "bg-slate-100 text-slate-600 italic"
              : "border border-slate-200 bg-white text-slate-800",
        )}
      >
        <div
          className={cn(
            "mb-0.5 text-[10px] uppercase tracking-wide",
            agent ? "text-indigo-200" : "text-slate-400",
          )}
        >
          {line.who}
        </div>
        {line.text}
      </div>
    </div>
  );
}

function Transcript({
  lines,
  when,
  summary,
}: {
  lines: Line[];
  when: string;
  summary: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900 text-sm">
        <Pill tone="green">Confirmed on file</Pill>
        <span>{summary}</span>
        <span className="ml-auto text-emerald-700 text-xs">
          {when} · recorded, transcribed
        </span>
      </div>
      <div className="space-y-2.5 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
        {lines.map((l, i) => (
          <Bubble key={`${l.who}-${i}`} line={l} />
        ))}
      </div>
    </div>
  );
}

export function FollowupTab({
  appeal,
  pages,
  filedAt,
}: {
  appeal: Appeal;
  pages: number;
  filedAt?: string;
}) {
  const [calling, setCalling] = useState(false);
  const [done, setDone] = useState(false);
  const onDone = useCallback(() => {
    setDone(true);
    toast.success("Receipt confirmed · due date captured", {
      description:
        "Reference, queue and decision due date written to the appeal. Nothing overwritten.",
    });
  }, []);
  if (appeal.callTranscript && appeal.receiptConfirmedAt) {
    return (
      <Transcript
        lines={appeal.callTranscript}
        when={fmtDate(appeal.receiptConfirmedAt, true)}
        summary="due date captured · no extra form required"
      />
    );
  }
  if (done) {
    return (
      <Transcript
        lines={liveTranscript(appeal, pages)}
        when="just now"
        summary="due date captured · logged to the clinical appeals queue"
      />
    );
  }
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="font-medium text-slate-900">
          Caller confirms receipt 3 business days after sending
        </div>
        <p className="mt-1 text-slate-600 text-xs leading-relaxed">
          {filedAt
            ? `Sent ${fmtDate(filedAt, true)} · call scheduled ${RECEIPT_CALL_AT}. `
            : "Scheduled automatically when the packet is sent. "}
          The agent navigates the IVR, holds so staff do not, confirms the
          packet is logged and writes the reference and due date back here.
          Staff are only pulled in if the payer says something is missing.
        </p>
      </div>
      {calling ? (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-4">
          <div className="mb-2 flex items-center gap-2 font-medium text-indigo-900 text-sm">
            <PhoneCall className="size-4" /> Calling provider services…
          </div>
          <LiveRun script={CALL_SCRIPT} running={calling} onDone={onDone} />
        </div>
      ) : (
        <Button
          className="bg-indigo-600 hover:bg-indigo-700"
          onClick={() => setCalling(true)}
        >
          <PhoneCall className="size-4" /> Call now
        </Button>
      )}
    </div>
  );
}
