"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/lib/core-ui/tabs";
import { type DenialStatus, denials } from "@/lib/demo/denials";
import { money, pct } from "@/lib/demo/format";
import { PageHeader, Panel, StatTile } from "@/lib/demo-ui/primitives";
import { DenialHeatmap } from "./denial-heatmap";
import {
  type DenialTab,
  rowsForTab,
  type StatusOverrides,
  summarize,
  withOverrides,
} from "./denial-helpers";
import { DenialSheet } from "./denial-sheet";
import { DenialsTable } from "./denials-table";
import { PreventionRules } from "./prevention-rules";

const TAB_COPY: Record<DenialTab, string> = {
  open: "Prior-authorization and claim denials still in play. Validity is checked against the payer's own policy before anyone drafts a word.",
  resolved:
    "Won on peer-to-peer or appeal, lost, or accepted and written off in the last 180 days.",
  claim:
    "Auth-to-claim reconciliation: denied for no auth / units exceeded when an authorization existed.",
};

export function DenialsClient() {
  const [tab, setTab] = useState<DenialTab>("open");
  const [overrides, setOverrides] = useState<StatusOverrides>({});
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [open, setOpen] = useState(false);

  const rows = useMemo(() => withOverrides(denials(), overrides), [overrides]);
  const visible = rowsForTab(rows, tab);
  const summary = summarize(rows);
  const selected = rows.find((d) => d.id === selectedId);
  const count = (t: DenialTab) => rowsForTab(rows, t).length;

  const setStatus = (id: string, status: DenialStatus) =>
    setOverrides((o) => ({ ...o, [id]: status }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Defend"
        title="Denials — validity, route, deadline"
        description="Every denial is checked against the payer's own policy before anyone drafts a word. The route is a recommendation; the clinician decides and signs. Deadlines count to when the payer must receive the packet, not when we send it."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile
          label="Open denials"
          value={summary.open}
          hint="PA and claim denials, all payers"
        />
        <StatTile
          label="$ at risk"
          value={money(summary.valueAtRisk)}
          tone="amber"
          hint="Visits delivered since denial at $244.29"
        />
        <StatTile
          label="Deadline inside 14 days"
          value={summary.deadlineSoon}
          tone={summary.deadlineSoon > 0 ? "red" : "green"}
          hint={
            summary.deadlineSoon > 0
              ? "Appeal window closing"
              : "No appeal window closing this fortnight"
          }
        />
        <StatTile
          label="Look invalid vs payer policy"
          value={pct(summary.invalidShare)}
          tone="violet"
          hint="Packet met the payer's stated criteria"
        />
        <StatTile
          label="Won / lost · 180 days"
          value={`${summary.won} / ${summary.lost}`}
          tone="green"
          hint="Peer-to-peer reversals and appeal decisions"
        />
      </div>
      <Panel
        title="Denial queue"
        description={TAB_COPY[tab]}
        padded={false}
        right={
          <Tabs value={tab} onValueChange={(v) => setTab(v as DenialTab)}>
            <TabsList className="bg-slate-100">
              <TabsTrigger value="open">Open · {count("open")}</TabsTrigger>
              <TabsTrigger value="resolved">
                Resolved · {count("resolved")}
              </TabsTrigger>
              <TabsTrigger value="claim">
                Claim denials · {count("claim")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
      >
        <DenialsTable
          rows={visible}
          selectedId={open ? selectedId : undefined}
          onSelect={(id) => {
            setSelectedId(id);
            setOpen(true);
          }}
        />
      </Panel>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <DenialHeatmap />
        <PreventionRules />
      </div>
      <DenialSheet
        denial={selected}
        open={open && !!selected}
        onClose={() => setOpen(false)}
        onStatus={setStatus}
      />
    </div>
  );
}
