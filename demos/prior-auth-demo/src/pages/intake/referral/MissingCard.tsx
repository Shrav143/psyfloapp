import { CheckCircle2, MailQuestion } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Pill } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import { referralGaps } from "./missing";

/** What the referral is missing, and the one action to ask the referrer for it. Accepting waits only on the items marked needed to accept. */
export function MissingCard({ record, onRequest, canAct }: { record: IntakeRecord; onRequest: () => void; canAct: boolean }) {
  const gaps = referralGaps(record);
  return (
    <Card data-card="Missing information">
      <CardHeader
        title="Missing information"
        subtitle={gaps.length ? `${gaps.length} item${gaps.length === 1 ? "" : "s"} to ask the referrer for` : "Nothing is missing at the referral stage"}
        right={gaps.length ? <Button size="sm" variant="primary" icon={MailQuestion} onClick={onRequest} disabled={!canAct} data-request-info>Request missing information</Button> : null}
      />
      <CardBody>
        {gaps.length ? (
          <ul className="flex flex-col gap-2">
            {gaps.map((g) => (
              <li key={g.key} className="flex flex-wrap items-center justify-between gap-2 text-[14px]">
                <span>{g.ask}</span>
                {g.blocking ? <Pill tone="risk">Needed to accept</Pill> : <Pill>Ask the referrer</Pill>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 text-[14px] text-good-ink"><CheckCircle2 size={16} className="ico" />The referral has what is needed to accept it.</p>
        )}
      </CardBody>
    </Card>
  );
}
