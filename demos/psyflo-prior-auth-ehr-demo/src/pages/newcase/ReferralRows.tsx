import { Button, Pill } from "@/components/ui";
import type { Referral } from "@/data/referrals";
import { plural } from "@/lib/format";
import { ago } from "@/lib/time";
import { useStore } from "@/store";
import { intakeStatus } from "@/pages/referrals/checklist";
import { ChannelTag, UrgencyPill } from "@/pages/referrals/Chips";

function Status({ r }: { r: Referral }) {
  const s = intakeStatus(r);
  if (s.kind === "waiting") return <Pill tone="neutral">Waiting on the referrer</Pill>;
  if (s.kind === "complete") return <Pill tone="good">Documents complete</Pill>;
  return <Pill tone="mid">{plural(s.n, "item")} {s.kind === "missing" ? "missing" : "to review"}</Pill>;
}

/** The open referrals at the sites in view, one row each. Review opens the referral's checklist in Intake. */
export function ReferralRows({ rows, onReview }: { rows: Referral[]; onReview: (id: string) => void }) {
  const clock = useStore((s) => s.clock);
  if (!rows.length) return <p className="text-[13px] text-muted">No open referrals</p>;
  return (
    <ul className="overflow-hidden rounded-2xl border border-edge bg-white">
      {rows.map((r) => (
        <li key={r.id} data-referral={r.id} className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[14px] font-semibold">{r.patient.initials}, {r.patient.age}</span>
              <span className="text-xs text-muted">{r.id}</span>
              {r.urgency !== "routine" ? <UrgencyPill urgency={r.urgency} /> : null}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
              <span className="truncate">{r.source.name}</span>
              <ChannelTag channel={r.channel} />
              <span>{ago(r.receivedAt, clock)}</span>
            </div>
          </div>
          <Status r={r} />
          <Button size="sm" aria-label={`Review ${r.patient.initials}, ${r.patient.age}, ${r.id}`} onClick={() => onReview(r.id)}>
            Review
          </Button>
        </li>
      ))}
    </ul>
  );
}
