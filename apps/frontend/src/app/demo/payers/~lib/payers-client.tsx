"use client";

import { useState } from "react";
import { payerScorecard } from "@/lib/demo/analytics";
import type { PayerId } from "@/lib/demo/types";
import { PageHeader } from "@/lib/demo-ui/primitives";
import { DenialMixChart } from "./denial-mix-chart";
import { PartialsPanel } from "./partials-panel";
import { PayerSheet } from "./payer-sheet";
import { PolicyChangesPanel } from "./policy-changes";
import { criteriaCounts } from "./scorecard-model";
import { ScorecardTable } from "./scorecard-table";
import { StoryCallout } from "./story-callout";
import { TrendChart } from "./trend-chart";

const WORDS = ["none", "one", "two", "three", "four", "five", "six"];

function words(n: number): string {
  return WORDS[n] ?? String(n);
}

export function PayersClient() {
  const [selected, setSelected] = useState<PayerId | null>(null);
  const rows = payerScorecard();
  const criteria = criteriaCounts();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Observed behaviour · never overwritten"
        title="Payer scorecard"
        description="Because nothing is overwritten we can compute what Sunwave makes impossible: the real approval rate by plan over six quarters, spanning the July 2025 Kentucky mandate."
      />
      <StoryCallout rows={rows} onOpen={setSelected} />
      <ScorecardTable rows={rows} onSelect={setSelected} />
      <div className="grid gap-6 xl:grid-cols-2">
        <TrendChart />
        <DenialMixChart />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <PartialsPanel />
        <PolicyChangesPanel />
      </div>
      <p className="text-slate-500 text-xs">
        Criteria transparency: the criteria set is a known field for{" "}
        {words(criteria.known)} payers and unconfirmed for{" "}
        {words(criteria.unconfirmed)} — that is honest and it is a useful
        question to ask provider relations.
      </p>
      <PayerSheet payerId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
