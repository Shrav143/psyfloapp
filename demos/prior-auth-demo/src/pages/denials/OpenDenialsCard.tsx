import { Card, CardHeader, Chip, ListRow, Pill } from "@/components/ui";
import { cn } from "@/lib/cn";
import { money } from "@/lib/format";
import type { PsyRequest } from "@/data/types";
import type { DenialMeta } from "@/data/denials";
import { resolveMeta } from "./lib/analysis";
import { PROGRAM_SHORT, routeChip } from "./lib/format";

interface Props {
  open: PsyRequest[];
  closed: PsyRequest[];
  selectedId: string | undefined;
  clock: number;
  meta: Record<string, DenialMeta>;
  onSelect: (id: string) => void;
}

function Row({ r, selected, clock, meta, onSelect }: { r: PsyRequest; selected: boolean; clock: number; meta: DenialMeta | undefined; onSelect: (id: string) => void }) {
  const chip = routeChip(r, clock);
  return (
    <ListRow selected={selected} onClick={() => onSelect(r.id)} className="gap-2.5 px-5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold underline decoration-1 underline-offset-[3px]">{r.id}</span>
          <Chip>{PROGRAM_SHORT[r.program]}</Chip>
        </div>
        <div className="truncate text-[13px] text-muted">{resolveMeta(r, meta).summary}</div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Pill tone={chip.tone} className="max-w-[150px] truncate">{chip.text}</Pill>
        <span className="text-xs text-muted">{money(r.atStake)}{r.chance !== undefined ? ` · ${r.chance}% win chance` : ""}</span>
      </div>
    </ListRow>
  );
}

/** Every open denial from the Dashboard's Appeal or call stage, nearest deadline first. Click one to load it on the left. */
export function OpenDenialsCard({ open, closed, selectedId, clock, meta, onSelect }: Props) {
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Open denials" right={<Pill tone={open.length ? "risk" : "good"}>{open.length}</Pill>} />
      {open.length ? open.map((r) => <Row key={r.id} r={r} selected={r.id === selectedId} clock={clock} meta={meta[r.id]} onSelect={onSelect} />) : <div className="px-6 py-5 text-sm text-muted">No open denials. Everything sent is approved or waiting.</div>}
      {closed.length ? (
        <div className={cn("border-t border-line")}>
          <div className="px-5 pt-3.5 pb-1 text-[11.5px] font-medium tracking-[0.1em] text-muted uppercase">Closed</div>
          {closed.map((r) => <Row key={r.id} r={r} selected={r.id === selectedId} clock={clock} meta={meta[r.id]} onSelect={onSelect} />)}
        </div>
      ) : null}
    </Card>
  );
}
