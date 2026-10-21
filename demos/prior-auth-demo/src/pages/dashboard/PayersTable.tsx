import { Card, CardHeader, Meter, Table, Td, Th, Tr } from "@/components/ui";
import type { PayerId, PayerSummary } from "@/data/types";
import { cn } from "@/lib/cn";
import type { DateRange } from "@/lib/dates";
import { periodWord, type PayerRow } from "./helpers";

const GROUP_LABEL: Record<PayerSummary["group"], string> = { "Ohio Medicaid": "Medicaid plan", Commercial: "Commercial", "Medicare Advantage": "Medicare Advantage", "Behavioral carve-out": "Carve-out" };

/** One row per payer. A click sets the Payer filter, a second click clears it. Totals are the sums of the rows. */
export function PayersTable({ rows, selected, range, narrowed, onPick }: { rows: PayerRow[]; selected: PayerId | "all"; range: DateRange; narrowed: boolean; onPick: (id: PayerId | "all") => void }) {
  const total = (pick: (r: PayerRow) => number) => rows.reduce((a, r) => a + pick(r), 0);
  const w = periodWord(range);
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Payers at a glance"
        subtitle={`Waiting now, how long decisions take, and how often they go your way. Pick a payer to narrow everything on this page.${narrowed ? " Waiting counts follow your Program and Request type filters." : ""}`}
      />
      <Table>
        <thead>
          <tr>
            <Th>Payer</Th>
            <Th>Waiting</Th>
            <Th>Decision time</Th>
            <Th>Approved as asked</Th>
            <Th>Denied ({w})</Th>
            <Th>Info asks ({w})</Th>
            <Th>Reached by</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const on = selected === r.payer.id;
            const toggle = () => onPick(on ? "all" : r.payer.id);
            const strong = r.approved >= 80;
            return (
              <Tr key={r.payer.id} selected={on} onClick={toggle} data-payer={r.payer.id}>
                <Td>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle();
                    }}
                    className="block text-left font-semibold hover:underline"
                  >
                    {r.payer.name}
                  </button>
                  <div className="text-xs text-muted">{GROUP_LABEL[r.payer.group]}</div>
                </Td>
                <Td className="font-semibold">{r.waiting}</Td>
                <Td>
                  <div className={cn("font-semibold", r.over && "text-mid")}>{r.payer.avgDecisionDays} d</div>
                  <div className="text-xs text-muted">typical {r.payer.typicalDecisionDays} d</div>
                </Td>
                <Td>
                  <div className={cn("font-semibold", strong ? "text-good" : "text-mid")}>{r.approved}%</div>
                  <Meter value={r.approved} color={strong ? "#2F6F5C" : "#A87A26"} height={5} className="mt-1 w-[70px]" />
                </Td>
                <Td>{r.denied}</Td>
                <Td>{r.infoAsks}</Td>
                <Td className="text-muted">{r.payer.reachedBy}</Td>
              </Tr>
            );
          })}
          <Tr>
            <Td className="font-semibold">All payers</Td>
            <Td className="font-semibold">{total((r) => r.waiting)}</Td>
            <Td className="text-muted">-</Td>
            <Td className="text-muted">-</Td>
            <Td className="font-semibold">{total((r) => r.denied)}</Td>
            <Td className="font-semibold">{total((r) => r.infoAsks)}</Td>
            <Td className="text-muted">-</Td>
          </Tr>
        </tbody>
      </Table>
    </Card>
  );
}
