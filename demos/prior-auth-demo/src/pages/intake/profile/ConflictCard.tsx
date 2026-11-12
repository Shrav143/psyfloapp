import { useState } from "react";
import { Check } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Pill } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import type { PayerId } from "@/data/types";
import { vaPlanOf } from "@/data/va/plans";
import { cn } from "@/lib/cn";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import { FieldStateBadge, SimulatedTag, SourceLink } from "../shared/provenance";
import { planCandidates, type PlanCandidate } from "./coverageModel";

const FROM_LABEL: Record<PlanCandidate["from"], string> = { on_file: "Plan on file", suggestion: "Found in a document", response: "Last eligibility response" };

/** Insurance records that disagree. A person chooses the current plan; Verify then checks again. Nothing is chosen for them. */
export function ConflictCard({ record }: { record: IntakeRecord }) {
  const resolve = useStore((s) => s.resolvePlanConflict);
  const candidates = planCandidates(record);
  const [choice, setChoice] = useState<PayerId | null>(null);
  if (candidates.length < 2) return null;
  const chosen = choice ? vaPlanOf(choice) : undefined;
  const reasons = record.eligibility.conflicts;
  return (
    <Card data-conflict="plan" className="border-risk-edge">
      <CardHeader title="Insurance records disagree" right={<Pill tone="risk">Conflict</Pill>} />
      <CardBody className="space-y-3">
        {reasons.length ? (
          <ul className="space-y-1 text-[13px] text-ink2">
            {reasons.map((t) => <li key={t}>{t}</li>)}
          </ul>
        ) : (
          <p className="text-[13px] text-ink2">{candidates.length} different plans are on this record. Choose the one that is current.</p>
        )}
        <div role="radiogroup" aria-label="Current plan" className="grid gap-2">
          {candidates.map((c) => {
            const on = c.payerId === choice;
            const plan = vaPlanOf(c.payerId);
            return (
              <div key={c.payerId} data-candidate={c.payerId} className={cn("rounded-xl border px-3.5 py-3", on ? "border-forest bg-sage-bg/60" : "border-line bg-white")}>
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="radio" name={`plan-${record.id}`} checked={on} onChange={() => setChoice(c.payerId)} className="mt-1 accent-forest" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold">{c.name}</span>
                    <span className="block text-[12px] text-muted">{FROM_LABEL[c.from]} · {plan?.coverage === "ffs" ? "Fee-for-service" : "Cardinal Care MCO"}</span>
                  </span>
                </label>
                <div className="mt-1.5 ml-7 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
                  {c.state && c.from !== "suggestion" ? <FieldStateBadge state={c.state} /> : null}
                  {c.from === "response" ? <SimulatedTag what="Simulated response" /> : null}
                  {c.source ? <SourceLink record={record} source={c.source} /> : null}
                  {c.at !== undefined ? <span>{stamp(c.at)}</span> : null}
                </div>
                {c.note ? <p className="mt-1 ml-7 text-[12px] text-ink2">{c.note}</p> : null}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" icon={Check} disabled={!chosen} onClick={() => choice && resolve(record.id, choice)}>
            {chosen ? `Use ${chosen.name} as the current plan` : "Choose the current plan"}
          </Button>
          <span className="text-[12px] text-muted">Then run the eligibility check again.</span>
        </div>
      </CardBody>
    </Card>
  );
}
