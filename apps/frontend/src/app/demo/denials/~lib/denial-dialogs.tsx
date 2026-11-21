"use client";

import { CalendarClock } from "lucide-react";
import { useState } from "react";
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
import type { Denial } from "@/lib/demo/denials";
import { money } from "@/lib/demo/format";
import { PAYER_BY_ID } from "@/lib/demo/payers";
import { P2P_CLINICIANS, P2P_SLOTS } from "./denial-helpers";

export function P2PDialog({
  open,
  denial,
  onClose,
  onScheduled,
}: {
  open: boolean;
  denial: Denial;
  onClose: () => void;
  onScheduled: (who: string, slot: string) => void;
}) {
  const [who, setWho] = useState(P2P_CLINICIANS[0] as string);
  const payer = PAYER_BY_ID[denial.payerId];
  return (
    <Dialog open={open} onOpenChange={(o) => (o ? undefined : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule peer-to-peer</DialogTitle>
          <DialogDescription>
            Slots offered by {payer.short}'s medical director line. The
            clinician takes the call; the agent prepares the criteria summary
            and the denial history for {denial.mrn}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-slate-500 text-xs">Clinician</div>
            <Select value={who} onValueChange={setWho}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {P2P_CLINICIANS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="mb-1 text-slate-500 text-xs">
              Pick a slot · booked on both calendars
            </div>
            <div className="grid gap-2">
              {P2P_SLOTS.map((slot) => (
                <Button
                  key={slot}
                  variant="outline"
                  className="justify-start"
                  onClick={() => onScheduled(who, slot)}
                >
                  <CalendarClock className="size-4 text-indigo-600" /> {slot}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AcceptDialog({
  open,
  denial,
  onClose,
  onConfirm,
}: {
  open: boolean;
  denial: Denial;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => (o ? undefined : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Accept denial and write off?</DialogTitle>
          <DialogDescription>
            {denial.mrn} · {money(denial.valueAtRisk)} at risk. The denial
            closes, the amount is recorded on the leakage report as preventable
            and the renewal gap is flagged on the renewal radar. The history
            stays on the ledger; nothing is deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Keep open
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Accept and write off
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
