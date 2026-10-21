import { useState } from "react";
import { Button, Card, SearchInput } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { PayerConfig } from "@/data/payerConfig";
import { groupRows, type PayerRow } from "./lib/payers";

/** Payers grouped by type. A green dot means up to date, an ochre dot means a change is waiting. */
export function PayerList({ rows, config, selectedId, onSelect }: { rows: PayerRow[]; config: Record<string, PayerConfig>; selectedId: string; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const groups = groupRows(rows, query);
  return (
    <Card className="overflow-hidden">
      <div className="px-5 pt-5 pb-4">
        <h3 className="font-serif text-[21px] leading-tight font-semibold">Payers</h3>
        <SearchInput className="mt-3" value={query} onChange={setQuery} placeholder="Search payers" />
      </div>
      {groups.length ? (
        groups.map((g) => (
          <div key={g.group}>
            <div className="border-t border-line px-5 pt-3 pb-1.5 text-[11.5px] font-medium tracking-[0.1em] text-muted uppercase">{g.group}</div>
            {g.rows.map((r) => {
              const waiting = !!config[r.id]?.pending;
              return (
                <button key={r.id} type="button" aria-current={r.id === selectedId} onClick={() => onSelect(r.id)} className={cn("flex w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-[#FBF8F3]", r.id === selectedId && "bg-[#F3F7F4] hover:bg-[#F3F7F4]")}>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{r.name}</span>
                    <span className="block text-xs text-muted">{r.type}</span>
                  </span>
                  <span className={cn("h-[9px] w-[9px] rounded-full", waiting ? "bg-mid" : "bg-good")} role="img" aria-label={waiting ? "Change waiting" : "Up to date"} />
                </button>
              );
            })}
          </div>
        ))
      ) : (
        <div className="flex flex-col items-start gap-2 border-t border-line px-5 py-5 text-sm text-muted">
          No payer matches “{query}”.
          <Button size="sm" variant="ghost" onClick={() => setQuery("")}>Clear search</Button>
        </div>
      )}
      <div className="flex items-center gap-4 border-t border-line px-5 py-3 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-good" />up to date</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-mid" />change waiting</span>
      </div>
    </Card>
  );
}
