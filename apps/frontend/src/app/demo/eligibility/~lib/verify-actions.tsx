"use client";

import { Play } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/lib/core-ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/lib/core-ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/lib/core-ui/select";
import { LiveRun } from "@/lib/demo-ui/agent-run";
import type { Summary } from "./elig-model";
import { CADENCES, type Cadence, RUN_SCRIPT } from "./run-scripts";

/** Header actions: replay the morning run, and pick how often Verify re-checks. */
export function VerifyActions({ summary }: { summary: Summary }) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [cadence, setCadence] = useState<Cadence>("weekly");

  const handleDone = useCallback(() => {
    setRunning(false);
    setOpen(false);
    toast.success(
      `${summary.total} members verified · ${summary.exceptions} exceptions`,
      {
        description:
          "No change since the 06:10 run. Every exception already has an action line; nothing on the chart was edited.",
      },
    );
  }, [summary.total, summary.exceptions]);

  const changeCadence = (value: string) => {
    const next = CADENCES.find((c) => c.value === value);
    if (!next) {
      return;
    }
    setCadence(next.value);
    toast.success("Re-verify cadence updated", {
      description: `${next.label} · applies from tomorrow's 06:10 run. Today's results are kept.`,
    });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-slate-500 text-xs">Re-verify cadence</span>
        <Select value={cadence} onValueChange={changeCadence}>
          <SelectTrigger size="sm" className="bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CADENCES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        className="bg-indigo-600 hover:bg-indigo-700"
        onClick={() => {
          setOpen(true);
          setRunning(true);
        }}
      >
        <Play className="size-4" /> Run verification now
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setRunning(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify · rolling 7-day run</DialogTitle>
            <DialogDescription>
              Re-checks the {summary.total} members with an appointment in the
              next 7 days against Availity and the WellCare portal. Results are
              appended to the ledger; coverage on the chart is never edited.
            </DialogDescription>
          </DialogHeader>
          <LiveRun script={RUN_SCRIPT} running={running} onDone={handleDone} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
