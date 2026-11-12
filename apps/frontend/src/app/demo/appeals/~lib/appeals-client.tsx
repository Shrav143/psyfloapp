"use client";

import { useMemo } from "react";
import { appeals } from "@/lib/demo/appeals";
import { money } from "@/lib/demo/format";
import { useDemoStore } from "@/lib/demo/store";
import { PageHeader, Panel, StatTile } from "@/lib/demo-ui/primitives";
import {
  applySession,
  freeCareValue,
  sortAppeals,
  summarizeAppeals,
} from "./appeal-helpers";
import { AppealsTable } from "./appeals-table";
import { PayerRules } from "./payer-rules";

export function AppealsClient() {
  const signed = useDemoStore((s) => s.signed);
  const submitted = useDemoStore((s) => s.submitted);
  const rows = useMemo(
    () => sortAppeals(appeals().map((a) => applySession(a, signed, submitted))),
    [signed, submitted],
  );
  const s = summarizeAppeals(rows);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Defend"
        title="Appeals — where is my appeal"
        description="Every appeal carries a filed date, a receipt confirmation and a decision clock. The Caller agent phones the payer three business days after sending, so a packet is never 'lost' for 45 days before anyone notices."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Filed · awaiting receipt"
          value={s.awaitingReceipt}
          tone={s.awaitingReceipt > 0 ? "amber" : "slate"}
          hint="Caller confirms 3 business days after sending"
        />
        <StatTile
          label="Under review"
          value={s.underReview}
          tone="blue"
          hint="Decision clock running at the payer"
        />
        <StatTile
          label="Won / lost"
          value={`${s.won} / ${s.lost}`}
          tone="green"
          hint="Decided in the last 180 days"
        />
        <StatTile
          label="Free care · open appeals"
          value={money(freeCareValue(s.freeCareDays))}
          tone="red"
          hint={`${s.freeCareDays} days × $244.29 across ${s.openCount} open appeal${s.openCount === 1 ? "" : "s"} · patients keep attending`}
        />
      </div>
      <Panel
        title="Open and recent appeals"
        description="Click a row for the workspace: timeline, reasoning, letters, packet, sign and send."
        padded={false}
      >
        <AppealsTable rows={rows} />
      </Panel>
      <PayerRules />
    </div>
  );
}
