import { SearchX } from "lucide-react";
import { AgentBadge, Button, Card, CardHeader, EmptyState, IdLink, Pill, ProgressBars, Table, Td, Th, Tr } from "@/components/ui";
import { PROGRAM_LABEL, type PsyRequest } from "@/data/types";
import { cn } from "@/lib/cn";
import { money } from "@/lib/format";
import { AUTH_TRACK, DENIAL_ROUTE, PAYER_ROW_LABEL, clockView, isDenial } from "./helpers";

export const PAGE_SIZE = 8;

const CLOCK_TONE = { ink: "text-ink", mid: "text-mid", risk: "text-risk-ink" } as const;

function Where({ r }: { r: PsyRequest }) {
  const steps = isDenial(r) ? DENIAL_ROUTE : AUTH_TRACK;
  const label = `${isDenial(r) ? "Route" : "Progress"}: ${steps.join(", ")}. Now at ${steps[r.progress]}.`;
  return (
    <div title={label}>
      <Pill tone={r.tone} dot>
        {r.chip}
      </Pill>
      <ProgressBars pos={r.progress} tone={r.tone} />
      <span className="sr-only">{label}</span>
    </div>
  );
}

function Row({ r, clock, onOpen }: { r: PsyRequest; clock: number; onOpen: (id: string) => void }) {
  const c = clockView(r, clock);
  return (
    <Tr onClick={() => onOpen(r.id)} data-request={r.id}>
      <Td>
        <IdLink onClick={() => onOpen(r.id)}>{r.id}</IdLink>
        <div className="text-xs text-muted">{r.type}</div>
      </Td>
      <Td>
        {PAYER_ROW_LABEL[r.payerId]}
        <div className="text-xs text-muted">{PROGRAM_LABEL[r.program]}</div>
      </Td>
      <Td>
        <Where r={r} />
      </Td>
      <Td>
        <div className={cn("font-semibold", CLOCK_TONE[c.tone])}>
          {c.main}
          {c.word ? <span className="ml-1 text-xs font-medium">{c.word}</span> : null}
        </div>
        {c.sub ? <div className="text-xs text-muted">{c.sub}</div> : null}
      </Td>
      <Td className="font-semibold">{money(r.atStake)}</Td>
      <Td>
        <div className="flex items-center gap-2">
          <AgentBadge agent={r.agent} size={24} />
          <span className="max-w-[290px] whitespace-normal text-[13.5px]">{r.next}</span>
        </div>
      </Td>
      <Td>
        <Button
          size="sm"
          aria-label={`Open ${r.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onOpen(r.id);
          }}
        >
          Open
        </Button>
      </Td>
    </Tr>
  );
}

interface Props {
  rows: PsyRequest[];
  total: number;
  atStake?: number;
  visible: number;
  clock: number;
  onOpen: (id: string) => void;
  onMore: () => void;
  onClear: () => void;
  canClear: boolean;
}

/** Exactly seven columns, always the same. Needs-you first, then the latest. */
export function RequestsTable({ rows, total, atStake, visible, clock, onOpen, onMore, onClear, canClear }: Props) {
  const shown = rows.slice(0, visible);
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Requests"
        subtitle="Bars show progress: Prepared, Received, In review, Decided. A denial shows Call, Appeal 1, Appeal 2, External. Over 1.5 × typical is late; over 2 × is very late."
        right={
          <span className="max-w-[260px] text-right text-sm text-muted" aria-live="polite">
            Showing {shown.length} of {total}
            {atStake !== undefined ? ` · ${money(atStake)} at stake` : ""}
          </span>
        }
      />
      {rows.length === 0 ? (
        <EmptyState icon={SearchX} title="No requests match" action={canClear ? <Button onClick={onClear}>Clear filters</Button> : undefined}>
          The filters hide everything. Clear them to see every request again.
        </EmptyState>
      ) : (
        <Table nowrap>
          <thead>
            <tr>
              <Th>Case</Th>
              <Th>Payer</Th>
              <Th>Where it is</Th>
              <Th>Clock</Th>
              <Th>At stake</Th>
              <Th>What happens next</Th>
              <Th>
                <span className="sr-only">Open</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <Row key={r.id} r={r} clock={clock} onOpen={onOpen} />
            ))}
          </tbody>
        </Table>
      )}
      {rows.length > shown.length ? (
        <div className="flex items-center justify-center gap-3 border-t border-line px-6 py-3.5">
          <Button onClick={onMore}>Show {Math.min(PAGE_SIZE, rows.length - shown.length)} more</Button>
          <span className="text-sm text-muted">{rows.length - shown.length} not shown</span>
        </div>
      ) : null}
    </Card>
  );
}
