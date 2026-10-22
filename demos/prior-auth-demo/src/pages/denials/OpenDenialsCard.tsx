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
      <button type="button" onClick={() => onSelect(r.id)} className="flex w-full items-center gap-2.5 px-5 py-3.5 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold underline decoration-1 underline-offset-[3px]">{r.id}</span>
            <Chip>{PROGRAM_SHORT[r.program]}</Chip>
          </div>
          <div className="truncate text-[13px] text-muted">{resolveMeta(r, meta).summary}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Pill tone={chip.tone} className="max-w-[150px] truncate">{chip.text}</Pill>
          {/* The empty span keeps room for the Report link, which sits on top of it (a link cannot live inside the row's button). */}
          <span className="text-xs text-muted">{r.chance !== undefined ? `${r.chance}% win chance` : ""}<span className="inline-block w-[62px]" aria-hidden="true" /></span>
        </div>
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
      <CardHeader title="Open denials" subtitle={filtered ? `${open.length} of ${openTotal} match the filters` : undefined} right={<Pill tone={open.length ? "risk" : "good"}>{open.length}</Pill>} />
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
