import type { KeyboardEvent, RefObject } from "react";
import { FileText, ScanText } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, Chip, Drawer, Pill } from "@/components/ui";
import type { DenialMeta } from "@/data/denials";
import type { PsyRequest } from "@/data/types";
import { cn } from "@/lib/cn";
import { paths } from "@/routes";
import { FilterChip } from "./FilterChips";
import { resolveMeta } from "./lib/analysis";
import { isFiltering, type DenialFilter } from "./lib/filters";
import { PROGRAM_SHORT, routeChip } from "./lib/format";
import { useDialogFocus } from "./lib/useDialogFocus";

interface Props {
  /** Open denials that match the filters, soonest deadline first, at the sites in view. */
  open: PsyRequest[];
  closed: PsyRequest[];
  /** How many denials are open at the sites in view before any filter from the address. */
  openTotal: number;
  selectedId: string | undefined;
  clock: number;
  meta: Record<string, DenialMeta>;
  filter: DenialFilter;
  /** "Both sites", "Site A" or "Site B". */
  siteLabel: string;
  /** The button that opened the panel, so focus goes back to it. */
  from: RefObject<HTMLElement | null>;
  onSelect: (id: string) => void;
  onClearFilter: () => void;
  onAddLetter: () => void;
  onClose: () => void;
}

function Row({ r, selected, clock, meta, onSelect }: { r: PsyRequest; selected: boolean; clock: number; meta: DenialMeta | undefined; onSelect: (id: string) => void }) {
  const chip = routeChip(r, clock);
  return (
    <li className={cn("relative border-b border-line last:border-b-0 hover:bg-[#FBF8F3]", selected && "bg-[#F3F7F4]")}>
      <button type="button" data-denial-row onClick={() => onSelect(r.id)} aria-current={selected ? "true" : undefined} className="block w-full px-6 py-3.5 text-left">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="font-semibold underline decoration-1 underline-offset-[3px]">{r.id}</span>
            <Chip>{PROGRAM_SHORT[r.program]}</Chip>
          </div>
          <Pill tone={chip.tone} className="max-w-[170px] truncate">{chip.text}</Pill>
        </div>
        <div className="mt-1 text-[13px] text-muted">{resolveMeta(r, meta).summary} · Authorization denial</div>
        {/* The empty span keeps room for the Report link, which sits on top of it (a link cannot live inside the row's button). */}
        <div className="mt-0.5 text-xs text-muted">{r.chance !== undefined ? `${r.chance}% win chance` : " "}<span className="inline-block w-[62px]" aria-hidden="true" /></div>
      </button>
      <Link to={paths.report(r.id)} className="absolute right-6 bottom-3.5 inline-flex items-center gap-1 text-xs font-semibold text-forest hover:underline">
        <FileText size={12} className="ico" />
        Report<span className="sr-only"> for {r.id}</span>
      </Link>
    </li>
  );
}

/** The up and down arrows move between the rows, so a long list is quick by keyboard; Tab still reaches each row and its Report link. */
function arrowRows(e: KeyboardEvent<HTMLElement>): void {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  const rows = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[data-denial-row]"));
  const at = rows.indexOf(document.activeElement as HTMLElement);
  if (at < 0) return;
  e.preventDefault();
  rows[(at + (e.key === "ArrowDown" ? 1 : -1) + rows.length) % rows.length].focus();
}

function Body({ open, closed, openTotal, selectedId, clock, meta, filter, onSelect, onClearFilter, from }: Omit<Props, "siteLabel" | "onAddLetter" | "onClose">) {
  const ref = useDialogFocus(from, ["[aria-current=true]", "[data-denial-row]", "[data-initial-focus]"]);
  const none = open.length === 0;
  return (
    <div ref={ref} tabIndex={-1} className="-mx-7 -my-6 outline-none">
      {isFiltering(filter) ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-white px-6 py-3 text-[13px] text-muted">
          <FilterChip filter={filter} onClear={onClearFilter} />
          <span>{open.length} of {openTotal} open</span>
        </div>
      ) : null}
      {none ? (
        <p className="px-6 py-6 text-sm text-muted">{openTotal ? "No open denials match the filters." : "No open denials. Everything sent is approved or waiting."}</p>
      ) : (
        <ul aria-label="Open denials" onKeyDown={arrowRows} className="m-0 list-none bg-white p-0">
          {open.map((r) => <Row key={r.id} r={r} selected={r.id === selectedId} clock={clock} meta={meta[r.id]} onSelect={onSelect} />)}
        </ul>
      )}
      {closed.length ? (
        <>
          <div className="px-6 pt-4 pb-1.5 text-[11.5px] font-medium tracking-[0.1em] text-muted uppercase">Closed</div>
          <ul aria-label="Closed denials" onKeyDown={arrowRows} className="m-0 list-none border-t border-line bg-white p-0">
            {closed.map((r) => <Row key={r.id} r={r} selected={r.id === selectedId} clock={clock} meta={meta[r.id]} onSelect={onSelect} />)}
          </ul>
        </>
      ) : null}
    </div>
  );
}

/** Every open denial from the Dashboard's Appeal or call stage at the sites in view, nearest deadline first, in a right-hand panel. Picking one switches the page to it and closes the panel. */
export function OpenDenialsPanel({ siteLabel, onAddLetter, onClose, ...body }: Props) {
  return (
    <Drawer
      open
      onClose={onClose}
      width={540}
      title="Open denials"
      subtitle={`${siteLabel}. Soonest deadline first. Authorization denials only.`}
      right={<Pill tone={body.open.length ? "risk" : "good"}>{body.open.length}</Pill>}
      footer={<Button icon={ScanText} data-initial-focus onClick={onAddLetter}>Add a denial letter</Button>}
    >
      <Body {...body} />
    </Drawer>
  );
}
