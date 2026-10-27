import { useMemo, useState } from "react";
import { Disclosure, Segmented } from "@/components/ui";
import { completeness } from "@/data/intake/checklist";
import type { IntakeRecord } from "@/data/intake/types";
import { AGENTS } from "@/data/agents";
import { useIntakeNow } from "../lib/policyNow";
import { AuditFeed } from "../review/AuditFeed";
import { ChecklistCard } from "../review/ChecklistCard";
import { DocsCard } from "../review/DocsCard";
import { HandoffCard } from "../review/HandoffCard";
import { packetOf } from "../review/packet";
import { ReadinessCard } from "../review/ReadinessCard";
import { TransitionPlanCard } from "../review/TransitionPlanCard";

type Who = "all" | "people" | "agents";

/** H. Documentation & review: intake completeness (the checklist), authorization readiness (kept apart), what is on file, the transition plan for a
    person on a retiring service, and the handoff packet to New Case. Every part is derived from the record, so it follows each edit at once. */
export function ReviewSection({ record }: { record: IntakeRecord }) {
  const now = useIntakeNow();
  const items = useMemo(() => completeness(record, now), [record, now]);
  const packet = useMemo(() => packetOf(record, now), [record, now]);
  const [who, setWho] = useState<Who>("all");
  const rd = packet.readiness;
  const handoff = rd.requirement === "authorization" || rd.requirement === "pending" || record.handoff.status !== "not_started";
  const audit = [...record.audit].reverse().filter((e) => who === "all" || (who === "agents" ? e.ai || e.actor in AGENTS : !(e.ai || e.actor in AGENTS)));
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <ReadinessCard record={record} rd={rd} />
      {record.legacy ? <TransitionPlanCard record={record} /> : null}
      {handoff ? <HandoffCard record={record} packet={packet} now={now} /> : null}
      <ChecklistCard recordId={record.id} items={items} />
      <DocsCard record={record} />
      <Disclosure title="Audit trail" summary={`${record.audit.length} events · every change by a person and every agent action`}>
        <div className="px-5 pt-3">
          <Segmented<Who> items={[{ id: "all", label: "All" }, { id: "people", label: "People" }, { id: "agents", label: "Agents" }]} value={who} onChange={setWho} />
        </div>
        <AuditFeed events={audit} empty="No events match." />
      </Disclosure>
    </div>
  );
}
