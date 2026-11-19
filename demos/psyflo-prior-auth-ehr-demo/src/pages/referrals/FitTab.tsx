import { Banner, Card, CardBody, CardHeader, Chip, AgentChip, Meter } from "@/components/ui";
import { ASAM_DIMS, type Referral } from "@/data/referrals";
import { PROGRAM_LABEL, PROGRAMS } from "@/data/types";
import { useStore } from "@/store";

function Severity({ value }: { value: number }) {
  return (
    <span className="flex gap-[3px]" role="img" aria-label={`${value} of 4`}>
      {[1, 2, 3, 4].map((i) => (
        <i key={i} className="block h-1.5 w-[18px] rounded-full" style={{ background: i <= value ? (value >= 3 ? "#A87A26" : "#2F6F5C") : "#E9DFD2" }} />
      ))}
    </span>
  );
}

/** Placement's read of the six ASAM dimensions, and what the program has room for. */
export function FitTab({ r }: { r: Referral }) {
  const capacity = useStore((s) => s.capacity);
  const f = r.fit;
  const differs = f.suggested !== r.program;
  return (
    <div className="flex flex-col gap-4">
      {differs ? (
        <Banner tone="mid" title={`The referral asks for ${PROGRAM_LABEL[r.program]}. Placement suggests ${PROGRAM_LABEL[f.suggested]}.`}>
          You choose the program when you accept. Placement only reads the referral. A clinician decides the level of care.
        </Banner>
      ) : null}
      <Card>
        <CardHeader title="Level of care" subtitle="Placement reads the referral against the six ASAM dimensions" right={<AgentChip agent="placement" />} />
        <CardBody className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-tile-edge bg-tile px-4 py-3.5">
              <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">The referral supports</div>
              <div className="mt-1 text-[18px] font-semibold">{PROGRAM_LABEL[f.suggested]}</div>
              <div className="mt-2 flex items-center gap-2.5 text-sm"><b>{f.confidence}%</b> confident<Meter value={f.confidence} color="#2F6F5C" className="w-24" /></div>
            </div>
            <div className="rounded-2xl border border-tile-edge bg-tile px-4 py-3.5">
              <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">Next best</div>
              <div className="mt-1 text-[18px] font-semibold">{PROGRAM_LABEL[f.alt]}</div>
              <div className="mt-2 flex items-center gap-2.5 text-sm"><b>{f.altConfidence}%</b> confident<Meter value={f.altConfidence} color="#A9A59C" className="w-24" /></div>
            </div>
          </div>
          <p className="text-sm text-ink2">{f.summary}</p>
          <ul>
            {ASAM_DIMS.map((d, i) => (
              <li key={d.name} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-neutral-bg text-xs font-semibold">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{d.name}</div>
                  <div className="text-[13px] text-muted">{d.notes[f.severity[i]]}</div>
                </div>
                <Severity value={f.severity[i]} />
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Capacity" subtitle="Open this week. Accepting a referral takes one bed or slot." />
        <ul>
          {PROGRAMS.map((p) => {
            const c = capacity[p];
            const used = ((c.total - c.open) / c.total) * 100;
            return (
              <li key={p} className="flex items-center gap-3 border-b border-line px-6 py-3.5 last:border-b-0" data-capacity={p}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={c.open === 0 ? "text-risk" : undefined}>
                      <b className="font-semibold">{PROGRAM_LABEL[p]}</b>: {c.open === 0 ? `no ${c.unit}s open this week` : `${c.open} ${c.unit}${c.open === 1 ? "" : "s"} open this week`}
                    </span>
                    {p === r.program ? <Chip>Requested</Chip> : null}
                    {p === f.suggested ? <Chip className="bg-good-bg text-good-ink">Suggested</Chip> : null}
                  </div>
                </div>
                <div className="w-32">
                  <Meter value={used} color={used >= 90 ? "#B5553A" : used >= 75 ? "#A87A26" : "#2F6F5C"} height={7} />
                  <div className="mt-1 text-right text-xs text-muted">{c.total - c.open} of {c.total} full</div>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
