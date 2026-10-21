import { useMemo, useState } from "react";
import { Button, Card, Pill } from "@/components/ui";
import { ago } from "@/lib/time";
import { useStore } from "@/store";
import { arrivedReferrals } from "./arrived";
import { toCheck } from "./checklist";
import { ChannelTag, UrgencyPill } from "./Chips";

const SHOWN = 6;

/** Referrals that already came in and are still open, as plain rows. "Check" loads one into the checklist. */
export function ArrivedList({ onCheck }: { onCheck: (id: string) => void }) {
  const referrals = useStore((s) => s.referrals);
  const clock = useStore((s) => s.clock);
  const [all, setAll] = useState(false);
  const open = useMemo(() => arrivedReferrals(referrals), [referrals]);
  if (!open.length) return null;
  const rows = all ? open : open.slice(0, SHOWN);

  return (
    <section aria-labelledby="arrived-title" className="flex flex-col gap-3">
      <div>
        <h2 id="arrived-title" className="font-serif text-[22px] font-semibold tracking-tight">Already arrived ({open.length})</h2>
        <p className="mt-0.5 text-[13.5px] text-muted">Referrals that came in by fax, e-referral, the portal or phone. Reader has read each one.</p>
      </div>
      <Card>
        <ul>
          {rows.map((r) => {
            const n = toCheck(r);
            return (
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
                  {r.status === "awaiting_info" ? <Pill tone="neutral">Waiting on the referrer</Pill> : n ? <Pill tone="mid">{n} to check</Pill> : <Pill tone="good">Nothing to check</Pill>}
                </span>
                <Button size="sm" aria-label={`Check ${r.patient.initials}, ${r.patient.age}, ${r.id}`} onClick={() => onCheck(r.id)}>Check</Button>
              </li>
            );
          })}
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
