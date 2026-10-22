import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardHeader, InfoTip } from "@/components/ui";
import type { StageKey } from "@/data/types";
import { cn } from "@/lib/cn";
import type { LedgerChip, StateChip } from "./lifecycle";

const FLAG = { late: "text-mid-ink", urgent: "text-risk-ink" } as const;
const CHIP = "flex flex-col gap-0.5 rounded-2xl border bg-white px-3 py-3 text-left transition-colors hover:bg-tile";

/** One card, one row of compact chips. The first five filter the table below and the active one is outlined in green; the last two count approved
    authorizations on the Case Manager ledger and open Case Manager, which is why they carry an arrow. No tinted fills and no icons beyond that arrow. */
export function Lifecycle({ chips, ledger, active, onPick }: { chips: StateChip[]; ledger: LedgerChip[]; active: StageKey | "all"; onPick: (stage: StageKey) => void }) {
  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-1.5">
            Lifecycle
            <InfoTip label="What the states count">
              <span className="block font-sans">Each state counts the authorizations at that point and filters the table. Active (approved, units left) and Renewal due (review due, or ending within 7 days) count approved authorizations on the Case Manager ledger and open Case Manager.</span>
            </InfoTip>
          </span>
        }
        subtitle="Where every authorization stands. Select a state to filter the table below."
      />
      <div className="flex flex-wrap items-stretch gap-2 px-6 py-5" role="group" aria-label="Lifecycle states">
        {chips.map((c) => {
          const on = active === c.stage;
          return (
            <button key={c.stage} type="button" aria-pressed={on} data-chip={c.stage} onClick={() => onPick(c.stage)} className={cn(CHIP, on ? "border-forest outline-1 outline-forest" : "border-field")}>
              <span className="flex items-baseline justify-between gap-2">
                <span className={cn("text-[14px] font-medium", on && "text-forest")}>{c.label}</span>
                <span className="text-[18px] font-semibold leading-none tabular-nums">{c.count}</span>
              </span>
              <span className={cn("text-[12.5px]", c.flag ? FLAG[c.flag] : "text-muted")}>{c.note}</span>
            </button>
          );
        })}
        <div className="flex items-stretch gap-2 min-[1400px]:border-l min-[1400px]:border-edge min-[1400px]:pl-3">
          {ledger.map((l) => (
            <Link key={l.id} to={l.to} data-chip={l.id} aria-label={`${l.label} ${l.count}. Opens Case Manager.`} className={cn(CHIP, "border-field")}>
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-[14px] font-medium">{l.label}</span>
                <span className="flex items-baseline gap-1.5">
                  <span className="text-[18px] font-semibold leading-none tabular-nums">{l.count}</span>
                  <ArrowUpRight size={14} className="ico self-center text-muted" aria-hidden="true" />
                </span>
              </span>
              <span className="text-[12.5px] text-muted">{l.note}</span>
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );
}
