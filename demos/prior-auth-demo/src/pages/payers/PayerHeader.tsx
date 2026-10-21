import { History, PenLine } from "lucide-react";
import { Button, Card, CardBody, Fact } from "@/components/ui";
import type { PayerConfig } from "@/data/payerConfig";
import { plural } from "@/lib/format";
import { planLineOf, type PayerRow } from "./lib/payers";

/** Name in serif, the plan line, Edit, and four facts from the last 90 days. */
export function PayerHeader({ row, cfg, edits, onEdit, onLog }: { row: PayerRow; cfg: PayerConfig; edits: number; onEdit: () => void; onLog: () => void }) {
  const typical = row.typicalDays === null ? "Not enough decisions yet" : plural(row.typicalDays, "day");
  return (
    <Card>
      <CardBody>
        <div className="flex items-start gap-5">
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-[28px] leading-tight font-semibold">{row.name}</h2>
            <p className="mt-1 text-muted">{planLineOf(cfg)}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="ghost" icon={History} onClick={onLog}>Edit log{edits ? ` (${edits})` : ""}</Button>
            <Button icon={PenLine} onClick={onEdit}>Edit</Button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-3">
          <Fact label="Approved as asked" value={row.approved === null ? "Not enough" : `${row.approved}%`} note={cfg.facts.approvedNote} />
          <Fact label="Typical decision" value={row.typicalDays === null ? "Not enough" : typical} note={cfg.facts.typicalNote} />
          <Fact label="Notice due" value={cfg.facts.noticeDue} note={cfg.facts.noticeNote} />
          <Fact label="Reached by" value={cfg.reachedBy} note={cfg.facts.backup} />
        </div>
      </CardBody>
    </Card>
  );
}
