import { X } from "lucide-react";
import { PAYERS } from "@/data/seed";
import { cn } from "@/lib/cn";
import { FIGURE_LABEL, type DenialRow, type FigureId } from "./lib/dashboard";

const CHIP = "flex items-baseline gap-2 rounded-xl border bg-white px-3 py-2 text-left transition-colors hover:bg-tile";

/** The figures above the table. Each one filters it; the active one is outlined. Closed sits apart because it switches to settled denials. */
export function DenialFigures({ counts, view, onPick }: { counts: Record<FigureId, number>; view: FigureId; onPick: (v: FigureId) => void }) {
  const chip = (id: FigureId) => {
    const on = view === id;
    return (
      <button key={id} type="button" aria-pressed={on} data-figure={id} onClick={() => onPick(id)} className={cn(CHIP, on ? "border-forest outline-1 outline-forest" : "border-field")}>
        <span className={cn("text-[14px] font-medium", on && "text-forest")}>{FIGURE_LABEL[id]}</span>
        <span className={cn("text-[18px] leading-none font-semibold tabular-nums", id === "week" && counts.week > 0 && "text-risk-ink")}>{counts[id]}</span>
      </button>
    );
  };
  return (
    <div role="group" aria-label="Denial figures" className="flex flex-wrap items-stretch gap-2">
      {(["open", "week", "decide", "call", "appeal"] as FigureId[]).map(chip)}
      <span className="mx-1 w-px self-stretch bg-edge max-[1100px]:hidden" aria-hidden="true" />
      {chip("closed")}
    </div>
  );
}

const PILL = "inline-flex h-[30px] items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium";

/** One chip per payer with a denial in the current view, with its count. ?reason= from Analytics shows as one more chip that clears it. */
export function PayerChips({ rows, payer, reason, onPayer, onClearReason }: { rows: DenialRow[]; payer: string | null; reason: string | null; onPayer: (id: string | null) => void; onClearReason: () => void }) {
  const count = (id: string) => rows.filter((r) => r.payerId === id).length;
  const present = PAYERS.filter((p) => count(p.id) > 0 || p.id === payer?.toLowerCase()).sort((a, b) => count(b.id) - count(a.id) || a.shortName.localeCompare(b.shortName));
  const chip = (id: string | null, label: string, n?: number) => {
    const on = (payer?.toLowerCase() ?? null) === id;
    return (
      <button key={id ?? "all"} type="button" aria-pressed={on} onClick={() => onPayer(on && id ? null : id)} className={cn(PILL, on ? "border-forest bg-[#F3F7F4] text-forest" : "border-field bg-white text-ink2 hover:bg-tile")}>
        {label}
        {n !== undefined ? <span className="text-[12px] text-muted tabular-nums">{n}</span> : null}
      </button>
    );
  };
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
      <div role="group" aria-label="Payer" className="flex flex-wrap items-center gap-2">
        {chip(null, "All payers")}
        {present.map((p) => chip(p.id, p.shortName, count(p.id)))}
      </div>
      {reason ? (
        <span className="inline-flex h-[30px] items-center gap-1.5 rounded-full bg-neutral-bg pr-1.5 pl-3 text-[13px] font-medium text-neutral-ink">
          Reason: {reason}
          <button type="button" aria-label="Clear the reason" onClick={onClearReason} className="grid h-5 w-5 place-items-center rounded-full hover:bg-white">
            <X size={13} className="ico" />
          </button>
        </span>
      ) : null}
    </div>
  );
}
