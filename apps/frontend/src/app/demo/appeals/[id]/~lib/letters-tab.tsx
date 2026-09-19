"use client";

import { RefreshCw, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/lib/core-ui/button";
import { Textarea } from "@/lib/core-ui/textarea";
import { Pill } from "@/lib/demo-ui/status-badge";

export function LetterEditor({
  title,
  hint,
  initial,
  rows,
}: {
  title: string;
  hint: string;
  initial: string;
  rows: number;
}) {
  const [text, setText] = useState(initial);
  const edited = text !== initial;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 font-medium text-slate-900 text-sm">
            {title}
            {edited ? (
              <Pill tone="amber">edited · unsigned</Pill>
            ) : (
              <Pill tone="slate">agent draft</Pill>
            )}
          </div>
          <p className="mt-0.5 text-slate-500 text-xs">{hint}</p>
        </div>
        <div className="flex gap-2">
          {edited ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setText(initial);
                toast("Reverted to the agent draft", {
                  description:
                    "Your edits stay in history; nothing is overwritten.",
                });
              }}
            >
              <Undo2 className="size-4" /> Revert
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              toast.success("Regenerated from the record", {
                description:
                  "Re-read LOCUS, treatment plan and payer criteria · previous draft kept as version 1",
              })
            }
          >
            <RefreshCw className="size-4" /> Regenerate
          </Button>
        </div>
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={rows}
        className="resize-y font-mono text-[13px] leading-relaxed"
      />
      <div className="text-[11px] text-slate-400">
        {text.length} characters · saved as a draft on every keystroke ·
        signature required before sending
      </div>
    </div>
  );
}
