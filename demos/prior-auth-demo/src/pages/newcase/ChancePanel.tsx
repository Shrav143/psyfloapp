import { Card, CardBody, CardHeader, Checkbox, Label, Pill, Ring } from "@/components/ui";
import { chanceRange, currentChance, FORECAST_STEP, similarCases, SUGGESTIONS, unmetPenalty, type CaseDraft } from "@/data/cases";
import { band, plural } from "@/lib/format";
import { useStore } from "@/store";

/** What holds the chance back: things the payer asks for that this case does not meet. Nothing when there are none. */
export function UnmetLine({ draft }: { draft: CaseDraft }) {
  if (draft.unmet <= 0) return null;
  return (
    <p className="text-xs text-mid-ink">
      Held back {unmetPenalty(draft.unmet)} points: {plural(draft.unmet, "thing")} the payer asks for {draft.unmet === 1 ? "is" : "are"} not met.
    </p>
  );
}

/** The approval chance: a ring that climbs as agents finish, where it started, the likely range and how many similar cases it rests on. */
export function ChancePanel({ draft }: { draft: CaseDraft }) {
  const chance = currentChance(draft);
  const settled = draft.run.done >= FORECAST_STEP;
  const range = chanceRange(chance, settled);
  const b = band(chance);
  const sc = draft.payerId && draft.program ? similarCases(draft.payerId, draft.program) : null;
  return (
    <Card>
      <CardBody className="flex flex-col items-center gap-3 text-center">
        <Label>Approval chance</Label>
        <Ring value={chance} size={120} stroke={12} />
        <div className="flex items-center gap-2 text-sm" aria-label={`Started at ${draft.startChance} percent, now ${chance} percent`}>
          <span className="text-muted">started at</span>
          <b style={{ color: band(draft.startChance).color }}>{draft.startChance}%</b>
          <span className="text-muted">→</span>
          <b style={{ color: b.color }}>{chance}%</b>
        </div>
        <Pill tone={b.tone} dot>
          {b.word}{settled ? "" : " so far"} · likely {range.lo}-{range.hi}%
        </Pill>
        <UnmetLine draft={draft} />
        <p className="text-xs text-muted">
          {sc ? `Based on ${sc.total.toLocaleString("en-US")} similar cases (${sc.own} your own, ${sc.network} network, ${sc.benchmark} benchmark). ` : ""}It estimates how well the paperwork fits this payer's past decisions. It never decides care.
        </p>
      </CardBody>
    </Card>
  );
}

/** Up to two things that raise the chance. Checking one adds a line to the draft. */
export function RaiseFurther({ draft }: { draft: CaseDraft }) {
  const patch = useStore((s) => s.patchCaseDraft);
  const named = draft.answers.some((a) => a.key === "stepdown" && a.choice === "named");
  const items = SUGGESTIONS.filter((s) => !(s.id === "stepdown" && named));
  if (!items.length) return null;
  return (
    <Card>
      <CardHeader title="To raise it further" />
      <ul>
        {items.map((s) => (
          <li key={s.id} className="flex items-start gap-3 border-b border-line px-6 py-3.5 last:border-b-0">
            <div className="min-w-0 flex-1">
              <Checkbox
                checked={draft.suggestions.includes(s.id)}
                onChange={(on) => patch(draft.id, { suggestions: on ? [...draft.suggestions, s.id] : draft.suggestions.filter((x) => x !== s.id), narrative: null })}
                label={s.title}
                className="items-start font-semibold"
              />
              <div className="pl-7 text-xs text-muted">{s.why}</div>
            </div>
            <Pill tone="good">{s.gain}</Pill>
          </li>
        ))}
      </ul>
    </Card>
  );
}
