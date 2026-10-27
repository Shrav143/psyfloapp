import { Checkbox, InfoTip, Label, Pill, Ring } from "@/components/ui";
import { chanceRange, currentChance, FORECAST_STEP, similarCases, SUGGESTIONS, unmetPenalty, type CaseDraft } from "@/data/cases";
import { NOT_ENOUGH_CASES } from "@/data/programTables";
import { isCoreProgram } from "@/data/types";
import { band, plural } from "@/lib/format";
import { useStore } from "@/store";

/** What holds the chance back: things the payer asks for that this case does not meet. Nothing when there are none. */
export function UnmetLine({ draft }: { draft: CaseDraft }) {
  if (draft.unmet <= 0) return null;
  return (
    <p className="text-[12px] text-mid-ink">
      −{unmetPenalty(draft.unmet)} points: {plural(draft.unmet, "payer requirement")} not met
    </p>
  );
}

/** A Virginia service has no similar decisions in the demo's data, so no approval chance is shown for it: no number is made up. */
export function NoChance() {
  return (
    <div className="flex min-w-0 flex-col gap-1.5" data-testid="no-chance">
      <div className="flex items-center gap-1">
        <Label>Approval chance</Label>
        <InfoTip label="About the approval chance">A chance is shown once there are enough similar decisions for this service and payer. The demo's data has none for this service yet.</InfoTip>
      </div>
      <p className="text-[13px] text-mid-ink">{NOT_ENOUGH_CASES}</p>
    </div>
  );
}

/** True when the draft is for a Virginia service, which has no approval chance. */
export const noChanceFor = (d: Pick<CaseDraft, "program">): boolean => !!d.program && !isCoreProgram(d.program);

/** The approval chance: a ring that climbs as agents finish, where it started, the likely range and how many similar cases it rests on. */
export function ChancePanel({ draft }: { draft: CaseDraft }) {
  if (noChanceFor(draft)) return <NoChance />;
  const chance = currentChance(draft);
  const settled = draft.run.done >= FORECAST_STEP;
  const range = chanceRange(chance, settled);
  const b = band(chance);
  const sc = draft.payerId && draft.program ? similarCases(draft.payerId, draft.program) : null;
  return (
    <div className="flex items-start gap-4">
      <Ring value={chance} size={86} stroke={9} />
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-center gap-1">
          <Label>Approval chance</Label>
          <InfoTip label="About the approval chance">How well the paperwork fits this payer's past decisions on similar cases. It never decides care and never blocks a request.</InfoTip>
        </div>
        <Pill tone={b.tone} dot className="w-fit whitespace-normal">
          {b.word}{settled ? "" : " so far"} · likely {range.lo}-{range.hi}%
        </Pill>
        <div className="text-[12px] text-muted" aria-label={`Started at ${draft.startChance} percent, now ${chance} percent`}>
          Started at <b style={{ color: band(draft.startChance).color }}>{draft.startChance}%</b>
          {sc ? ` · ${sc.total.toLocaleString("en-US")} similar cases (${sc.own} own, ${sc.network} network, ${sc.benchmark} benchmark)` : ""}
        </div>
        <UnmetLine draft={draft} />
      </div>
    </div>
  );
}

/** Up to two things that raise the chance. Checking one adds a line to the draft. */
export function RaiseFurther({ draft }: { draft: CaseDraft }) {
  const patch = useStore((s) => s.patchCaseDraft);
  const named = draft.answers.some((a) => a.key === "stepdown" && a.choice === "named");
  const items = SUGGESTIONS.filter((s) => !(s.id === "stepdown" && named));
  if (!items.length || noChanceFor(draft)) return null;
  return (
    <div>
      <Label className="mb-1">To raise it further</Label>
      <ul>
        {items.map((s) => (
          <li key={s.id} className="flex items-start gap-3 border-b border-line py-2 last:border-b-0">
            <div className="min-w-0 flex-1">
              <Checkbox
                checked={draft.suggestions.includes(s.id)}
                onChange={(on) => patch(draft.id, { suggestions: on ? [...draft.suggestions, s.id] : draft.suggestions.filter((x) => x !== s.id), narrative: null })}
                label={<span className="text-[13px] font-medium">{s.title}</span>}
                className="items-start"
              />
              <div className="pl-7 text-[12px] text-muted">{s.why}</div>
            </div>
            <Pill tone="good">{s.gain}</Pill>
          </li>
        ))}
      </ul>
    </div>
  );
}
