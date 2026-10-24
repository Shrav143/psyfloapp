"use client";

import { useDemoStore } from "@/lib/demo/store";
import { StatTile } from "@/lib/demo-ui/primitives";
import {
  HOLD_HOURS_ABSORBED,
  openQuestions,
  RUNS_TODAY,
  SOURCES_TODAY,
} from "./agents-model";

export function StatTiles({ onQuestions }: { onQuestions: () => void }) {
  const answered = useDemoStore((s) => s.answeredQuestions);
  const waiting = openQuestions(answered);
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatTile
        label="Runs today"
        value={RUNS_TODAY}
        hint="Across seven agents · each one in the ledger"
      />
      <StatTile
        label="Sources checked today"
        value={SOURCES_TODAY}
        hint="Portals, 270/271 responses, bulletins"
        tone="blue"
      />
      <StatTile
        label="Questions waiting for a human"
        value={waiting}
        hint={
          waiting > 0
            ? "Click to answer · the run resumes"
            : "Nothing is blocked on a person"
        }
        tone={waiting > 0 ? "amber" : "green"}
        onClick={onQuestions}
      />
      <StatTile
        label="Hold time absorbed"
        value={HOLD_HOURS_ABSORBED}
        hint="Payer phone holds nobody at Harbor sat through"
        tone="violet"
      />
    </div>
  );
}
