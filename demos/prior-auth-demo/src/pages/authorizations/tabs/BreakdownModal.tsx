import { Button, Label, Modal, Pill } from "@/components/ui";
import { IllustrativeTag } from "@/components/ui/IllustrativeTag";
import { driverView, outcomeSplit } from "@/data/caseModel";
import { band as chanceBand } from "@/lib/format";
import type { CaseCtx } from "../caseTypes";
import { DriverBars, formulaOf } from "./DriverBars";

const OUTCOME_COLOR = ["#2E7D52", "#A87A26", "#B5553A"];

/** "See the breakdown": the rows that add up to the approval chance, and what the payer is likely to decide. */
export function BreakdownModal({ ctx, onClose }: { ctx: CaseCtx; onClose: () => void }) {
  const { detail, work, chance } = ctx;
  const { rows, total } = driverView(detail, work);
  const b = chanceBand(chance);
  const split = outcomeSplit(chance);
  return (
    <Modal open onClose={onClose} title={`Why ${total}%`} subtitle={<span data-testid="formula">{formulaOf(rows, total)}</span>} footer={<Button variant="primary" onClick={onClose}>Close</Button>}>
      <div className="mb-1 flex items-center justify-end gap-2"><IllustrativeTag /><Pill tone={b.tone} dot>{b.word} · {total}%</Pill></div>
      <DriverBars rows={rows} total={total} />
      <Label className="mt-4 mb-2">Likely outcomes</Label>
      <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-1.5 p-0 text-[13px]" data-testid="outcomes">
        {(["Approved as asked", "Partly approved", "Denied"] as const).map((l, i) => (
          <li key={l} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: OUTCOME_COLOR[i] }} aria-hidden="true" />
            {l} <b>{split[i]}%</b>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
