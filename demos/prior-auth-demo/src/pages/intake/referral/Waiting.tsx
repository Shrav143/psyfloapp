import { AgentChip, Button, Card, CardBody, CardHeader } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import { openInfoRequests } from "./logic";

/** The requests that wait on the referrer's reply (the follow-up Needs information adds). A person records the reply when it comes. */
export function Waiting({ record }: { record: IntakeRecord }) {
  const reply = useStore((s) => s.markIntakeInfoReply);
  const open = openInfoRequests(record);
  if (!open.length) return null;
  return (
    <Card data-card="Waiting on the referrer">
      <CardHeader title="Waiting on the referrer" subtitle={`${open.length} request${open.length === 1 ? "" : "s"} sent, no reply yet`} />
      <CardBody className="flex flex-col gap-3">
        {open.map((t) => (
          <div key={t.id} data-waiting className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-line bg-tile px-3.5 py-2.5">
            <div className="min-w-0 text-[13px]">
              <div className="flex flex-wrap items-center gap-2">
                <AgentChip agent="navigator" />
                <span className="font-semibold">Follow-up</span>
                <span className="text-muted">since {stamp(t.at)}</span>
              </div>
              {t.result ? <p className="mt-1 text-ink2">{t.result}</p> : null}
            </div>
            <Button size="sm" onClick={() => reply(record.id, t.id)} data-reply-received>Mark reply received</Button>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
