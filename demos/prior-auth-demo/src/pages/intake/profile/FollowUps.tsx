import { Check } from "lucide-react";
import { AgentChip, Button, Card, CardBody, CardHeader, Pill } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";

/** What staff still have to do about coverage: Verify's follow-ups and the ones people created. */
export function FollowUpsCard({ record }: { record: IntakeRecord }) {
  const complete = useStore((s) => s.completeFollowUp);
  const ids = useStore((s) => s.coverageFollowUps);
  const mine = record.tasks.filter((t) => ids.includes(t.id));
  const open = mine.filter((t) => t.status === "needs_you");
  const done = mine.filter((t) => t.status === "done");
  if (!open.length && !done.length) return null;
  return (
    <Card data-card="follow-ups">
      <CardHeader title="Coverage follow-ups" right={<Pill tone={open.length ? "mid" : "good"}>{open.length ? `${open.length} open` : "All done"}</Pill>} />
      <CardBody className="py-1">
        <ul>
          {open.map((t) => (
            <li key={t.id} data-followup={t.id} className="flex flex-wrap items-start justify-between gap-3 border-b border-line py-3 last:border-b-0">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium">{t.action}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-muted">
                  <AgentChip agent={t.agent} />
                  {t.result ? <span>{t.result}</span> : null}
                  <span>{stamp(t.at)}</span>
                </p>
              </div>
              <Button size="sm" icon={Check} onClick={() => complete(record.id, t.id)}>Mark done</Button>
            </li>
          ))}
        </ul>
        {done.length ? <p className="py-2 text-[12px] text-muted">{done.length} done: {done.map((t) => t.action).join("; ")}</p> : null}
      </CardBody>
    </Card>
  );
}
