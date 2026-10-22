import { useState } from "react";
import { Button, Card, SearchInput } from "@/components/ui";
import { programsShort } from "@/data/payerConfigPlan";
import { cn } from "@/lib/cn";
import { filterRows, type PayerRow } from "./lib/payers";

/** One compact row per payer: name, plan type and programs, what the payer asks for, and a mark when a change is waiting. The row opens the payer. */
function Row({ r, selected, onSelect }: { r: PayerRow; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" aria-current={selected} onClick={onSelect} className={cn("grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-t border-line px-5 py-2.5 text-left hover:bg-[#FBF8F3]", selected && "bg-[#F3F7F4] hover:bg-[#F3F7F4]")}>
      <span className="min-w-0">
        <span className="block truncate font-semibold" title={r.name}>{r.name}</span>
        <span className="block text-xs text-muted">{[r.plan?.short, programsShort(r.programs)].filter(Boolean).join(" · ")}</span>
      </span>
      <span className="flex flex-col items-end gap-1">
        <span className="text-xs whitespace-nowrap text-muted">{r.needs}</span>
        <span className={cn("flex items-center gap-1.5 text-[11.5px] font-semibold whitespace-nowrap", r.waiting ? "text-mid-ink" : "text-muted")}>
          {r.waiting ? "Change waiting" : null}
          <span className={cn("h-[9px] w-[9px] rounded-full", r.waiting ? "bg-mid" : "bg-good")} role="img" aria-label={r.waiting ? "Change waiting" : "No change waiting"} />
        </span>
      </span>
    </button>
  );
}

/** The payers, searchable. On a wide screen it is a column beside the payer; on a narrow one it sits above and fills two columns when there is room. */
export function PayerList({ rows, selectedId, onSelect }: { rows: PayerRow[]; selectedId: string; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const shown = filterRows(rows, query);
  const waiting = rows.filter((r) => r.waiting).length;
  return (
    <Card className="@container overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 pt-5 pb-4">
        <div className="min-w-0">
          <h3 className="font-serif text-[21px] leading-tight font-semibold">Payers</h3>
          <p className="text-xs text-muted">{waiting ? `${waiting} with a change waiting` : "No change waiting"}</p>
        </div>
        <SearchInput className="min-w-[180px] flex-1" value={query} onChange={setQuery} placeholder="Search payers" />
      </div>
      {shown.length ? (
        <div className="grid grid-cols-1 @lg:grid-cols-2">
          {shown.map((r) => (
            <Row key={r.id} r={r} selected={r.id === selectedId} onSelect={() => onSelect(r.id)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-2 border-t border-line px-5 py-5 text-sm text-muted">
          No payer matches “{query}”.
          <Button size="sm" variant="ghost" onClick={() => setQuery("")}>Clear search</Button>
        </div>
      )}
    </Card>
  );
}
