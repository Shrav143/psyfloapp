import { FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardHeader, Chip, Pill } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { PsyRequest } from "@/data/types";
import type { DenialMeta } from "@/data/denials";
import { paths } from "@/routes";
import { resolveMeta } from "./lib/analysis";
import { PROGRAM_SHORT, routeChip } from "./lib/format";

interface Props {
  open: PsyRequest[];
  closed: PsyRequest[];
  /** How many denials are open before any filter from the address. */
  openTotal: number;
  selectedId: string | undefined;
  clock: number;
  meta: Record<string, DenialMeta>;
  onSelect: (id: string) => void;
}

function Row({ r, selected, clock, meta, onSelect }: { r: PsyRequest; selected: boolean; clock: number; meta: DenialMeta | undefined; onSelect: (id: string) => void }) {
  const chip = routeChip(r, clock);
  return (
    <div className={cn("relative border-b border-line last:border-b-0 hover:bg-[#FBF8F3]", selected && "bg-[#F3F7F4]")}>
      <button type="button" onClick={() => onSelect(r.id)} aria-current={selected ? "true" : undefined} className="block w-full px-5 py-3.5 text-left">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="font-semibold underline decoration-1 underline-offset-[3px]">{r.id}</span>
            <Chip>{PROGRAM_SHORT[r.program]}</Chip>
          </div>
          <Pill tone={chip.tone} className="max-w-[150px] truncate">{chip.text}</Pill>
        </div>
        <div className="mt-1 text-[13px] text-muted">{resolveMeta(r, meta).summary} · Authorization denial</div>
        {/* The empty span keeps room for the Report link, which sits on top of it (a link cannot live inside the row's button). */}
        <div className="mt-0.5 text-xs text-muted">{r.chance !== undefined ? `${r.chance}% win chance` : "\u00a0"}<span className="inline-block w-[62px]" aria-hidden="true" /></div>
      </button>
      <Link to={paths.report(r.id)} className="absolute right-5 bottom-3.5 inline-flex items-center gap-1 text-xs font-semibold text-forest hover:underline">
        <FileText size={12} className="ico" />
        Report<span className="sr-only"> for {r.id}</span>
      </Link>
    </div>
  );
}

/** Every open denial from the Dashboard's Appeal or call stage, nearest deadline first. Click one to load it on the left. */
export function OpenDenialsCard({ open, closed, openTotal, selectedId, clock, meta, onSelect }: Props) {
  const filtered = open.length < openTotal;
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Open denials" subtitle={`${filtered ? `${open.length} of ${openTotal} match the filters. ` : ""}Soonest deadline first`} right={<Pill tone={open.length ? "risk" : "good"}>{open.length}</Pill>} />
      {open.length ? open.map((r) => <Row key={r.id} r={r} selected={r.id === selectedId} clock={clock} meta={meta[r.id]} onSelect={onSelect} />) : <div className="px-6 py-5 text-sm text-muted">{openTotal ? "No open denials match the filters." : "No open denials. Everything sent is approved or waiting."}</div>}
      {closed.length ? (
        <div className={cn("border-t border-line")}>
          <div className="px-5 pt-3.5 pb-1 text-[11.5px] font-medium tracking-[0.1em] text-muted uppercase">Closed</div>
          {closed.map((r) => <Row key={r.id} r={r} selected={r.id === selectedId} clock={clock} meta={meta[r.id]} onSelect={onSelect} />)}
        </div>
      ) : null}
    </Card>
  );
}
