import { useMemo, useState } from "react";
import { Button, Card, Pill } from "@/components/ui";
import { useScope } from "@/lib/scope";
import { plural } from "@/lib/format";
import { ago } from "@/lib/time";
import { useStore } from "@/store";
import { arrivedReferrals } from "./arrived";
import { intakeStatus } from "./checklist";
import { ChannelTag, UrgencyPill } from "./Chips";

const SHOWN = 6;

/** The status a referral shows in the list, in the words of the product: Documents complete, N items missing (only when Reader found nothing for something),
    otherwise N items to review. A referral waiting on its referrer says so. */
function Status({ r }: { r: Parameters<typeof intakeStatus>[0] }) {
  const s = intakeStatus(r);
  if (s.kind === "waiting") return <Pill tone="neutral">Waiting on the referrer</Pill>;
  if (s.kind === "complete") return <Pill tone="good">Documents complete</Pill>;
  if (s.kind === "missing") return <Pill tone="mid">{plural(s.n, "item")} missing</Pill>;
  return <Pill tone="mid">{plural(s.n, "item")} to review</Pill>;
}

/** Referrals that already came in and are still open, for the sites in view only, as plain rows. "Review" opens one as a checklist. */
export function IncomingReferrals({ onReview }: { onReview: (id: string) => void }) {
  const referrals = useStore((s) => s.referrals);
  const clock = useStore((s) => s.clock);
  const scope = useScope();
  const [all, setAll] = useState(false);
  const open = useMemo(() => scope.filter(arrivedReferrals(referrals), (r) => r.id), [referrals, scope]);
  if (!open.length) return null;
  const rows = all ? open : open.slice(0, SHOWN);

  return (
    <section aria-labelledby="incoming-title" className="flex flex-col gap-3">
      <div>
        <h2 id="incoming-title" className="font-serif text-[22px] font-semibold tracking-tight">Incoming referrals ({open.length})</h2>
        <p className="mt-0.5 text-[13.5px] text-muted">Referrals that came in by fax, e-referral, the portal or phone, at {scope.label.toLowerCase()}. Reader has read each one.</p>
      </div>
      <Card>
        <ul>
          {rows.map((r) => (
            <li key={r.id} data-referral={r.id} className="flex items-center gap-4 border-b border-line px-6 py-3.5 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-semibold">{r.patient.initials}, {r.patient.age}</span>
                  <span className="text-xs text-muted">{r.id}</span>
                  {r.urgency !== "routine" ? <UrgencyPill urgency={r.urgency} /> : null}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-[13.5px] text-muted">
                  <span>{r.source.name}</span>
                  <ChannelTag channel={r.channel} />
                  <span>{ago(r.receivedAt, clock)}</span>
                </div>
              </div>
              <span className="flex shrink-0 justify-end">
                <Status r={r} />
              </span>
              <Button size="sm" aria-label={`Review ${r.patient.initials}, ${r.patient.age}, ${r.id}`} onClick={() => onReview(r.id)}>Review</Button>
            </li>
          ))}
        </ul>
      </Card>
      {open.length > SHOWN ? (
        <div>
          <Button size="sm" variant="ghost" className="-ml-2" aria-expanded={all} onClick={() => setAll(!all)}>{all ? "Show fewer" : `Show ${open.length - SHOWN} more`}</Button>
        </div>
      ) : null}
    </section>
  );
}
