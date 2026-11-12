"use client";

import { visitValue } from "@/lib/demo/derive";
import { money, VISIT_RATE } from "@/lib/demo/format";
import { Panel } from "@/lib/demo-ui/primitives";
import { eligRows, isException, LAPSE } from "./elig-model";

/** Three facts about why a rolling, benefit-aware check beats a button. */
export function WhyPanel() {
  const exceptions = eligRows().filter((r) => isException(r.status));
  const stillActive = exceptions.filter((r) => r.coverageActive).length;
  const cards = [
    {
      id: "nirvana",
      number: `${stillActive} of ${exceptions.length}`,
      title: "Nirvana returns 'verified' only",
      body: `Sunwave's built-in check answers active or inactive plus a deductible. No carve-out, no coordination of benefits, no daily limit, no re-verification cadence. ${stillActive} of this morning's ${exceptions.length} exceptions have active coverage, so a binary check would have called every one of them verified.`,
    },
    {
      id: "friday",
      number: "1 press / week",
      title: "Sunwave button is pressed manually every Friday",
      body: "One press per member, by hand, once a week. A plan switch, a lapse or a new primary payer that lands on Monday is invisible until the next press. Verify runs every morning at 06:10 for every member with an appointment in the next 7 days.",
    },
    {
      id: "lapse",
      number: money(visitValue(20)),
      title: "A lapse caught after 20 sessions is 20 unbillable visits",
      body: `At ${money(VISIT_RATE, { cents: true })} per visit day, every session delivered after coverage ends is unbillable and not recoverable on appeal. Today's lapse was caught at ${LAPSE.visitsSince} visits (${money(visitValue(LAPSE.visitsSince))}), not 20.`,
    },
  ];
  return (
    <Panel
      title="Why this matters"
      description="What a weekly button in the EHR misses, in Harbor's own numbers."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.id}
            className="rounded-lg border border-slate-200 bg-slate-50 p-4"
          >
            <div className="font-semibold text-2xl text-slate-900 tracking-tight">
              {c.number}
            </div>
            <div className="mt-1 font-medium text-slate-900 text-sm">
              {c.title}
            </div>
            <p className="mt-2 text-slate-600 text-xs leading-relaxed">
              {c.body}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
