"use client";

import { AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/lib/core-ui/button";
import type { ScorecardRow } from "@/lib/demo/analytics";
import { pct } from "@/lib/demo/format";
import type { PayerId } from "@/lib/demo/types";
import { clinicAggregate, wellcareStory } from "./scorecard-model";

export function StoryCallout({
  rows,
  onOpen,
}: {
  rows: ScorecardRow[];
  onOpen: (id: PayerId) => void;
}) {
  const story = wellcareStory();
  const aggregate = clinicAggregate(rows);
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-wrap items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <div className="font-medium text-amber-900 text-sm">
            WellCare first-pass approval fell {pct(story.from)} →{" "}
            {pct(story.to)} across three quarters while partial approvals rose
            to {pct(story.partial)}. The clinic aggregate (~
            {pct(aggregate.rate)}) hides it.
          </div>
          <div className="mt-1 text-amber-800 text-xs">
            {pct(story.from)} is {story.fromQuarter}, {pct(story.to)} is{" "}
            {story.toQuarter}; the fall is concentrated in Q1–Q3 26. The
            aggregate is the requests-weighted first-pass rate across five MCOs
            this quarter, n = {aggregate.requests} decided requests.
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="bg-white"
          onClick={() => onOpen("wellcare")}
        >
          Open WellCare <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
