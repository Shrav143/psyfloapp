import { useMemo, useRef, useState } from "react";
import { Card, ChecklistGroup, ChecklistProgress, Pill } from "@/components/ui";
import type { CaseDraft, DocSlotId } from "@/data/cases";
import { uid } from "@/lib/format";
import { useStore } from "@/store";
import { selectUnmappedForConnected } from "@/store/emr";
import { referralPrefill } from "@/store/referrals";
import { CoverageRow } from "./CoverageRow";
import { DocPreviewDrawer } from "./DocPreviewDrawer";
import { DocRow } from "./DocRow";
import { makeDocument } from "./documents";
import { FieldRow } from "./FieldRow";
import { intakeMissing } from "./intakeRules";
import { EMR_CHARTS } from "./lookups";
import { usePayerContext } from "./payerContext";
import { buildChecklist, isDocRow, slotOf, tally, type RowId } from "./recordsModel";
import { useCoverageCheck, useReading } from "./useRecordsTimers";

/** The whole step in one card: how many things are ready, then four short lists. Only one editor is open at a time. */
export function RecordsChecklist({ draft }: { draft: CaseDraft }) {
  const clock = useStore((s) => s.clock);
  const referrals = useStore((s) => s.referrals);
  const put = useStore((s) => s.putCaseDocs);
  const [open, setOpen] = useState<RowId | null>(null);
  const [preview, setPreview] = useState<DocSlotId | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const pickFor = useRef<{ slot: DocSlotId; replace: boolean } | null>(null);
  const ctx = usePayerContext(draft);
  useReading(draft);
  useCoverageCheck(draft, clock);

  /* The fields of the system the chart came from that still wait for a mapping in EMR Connect. */
  const emrUnmapped = useStore((s) => s.emrUnmapped);
  const emrSystems = useStore((s) => s.emrSystems);
  const unmapped = useMemo(() => {
    const system = EMR_CHARTS.find((c) => c.id === draft.emrChart)?.systemId;
    return selectUnmappedForConnected(useStore.getState()).filter((u) => u.systemId === system);
    // The selector reads these two lists; the store is read directly so it can stay a plain function of the state.
  }, [emrUnmapped, emrSystems, draft.emrChart]);
  const referral = useMemo(() => (draft.referralId ? referralPrefill(useStore.getState(), draft.referralId) : null), [referrals, draft.referralId]);
  const groups = useMemo(() => buildChecklist(draft, clock, referral, ctx, unmapped), [draft, clock, referral, ctx, unmapped]);
  const all = tally(groups);
  const ready = intakeMissing(draft, ctx.items).length === 0;
  const toggle = (id: RowId) => setOpen((cur) => (cur === id ? null : id));

  const pick = (slot: DocSlotId, replace = false) => {
    pickFor.current = { slot, replace };
    picker.current?.click();
  };
  /** A file chosen for a row. When it replaces one, Reader reads it again and the demo reads it clean. */
  const took = (list: FileList | null) => {
    const file = list?.[0];
    const target = pickFor.current;
    if (file && target) put(draft.id, [makeDocument(target.slot, { id: uid("f"), name: file.name, sizeKb: Math.max(1, Math.round(file.size / 1024)) }, false, "validating", target.replace)]);
    if (picker.current) picker.current.value = "";
  };

  return (
    <Card>
      <div className="px-6 pt-6 pb-5">
        <ChecklistProgress done={all.done} total={all.total} right={ready ? <Pill tone="good" dot>Ready to continue</Pill> : null} />
      </div>
      {groups.map((g) => {
        const count = tally([g]);
        return (
          <ChecklistGroup key={g.id} title={g.title} done={count.done} total={count.total}>
            {g.note ? <li className="px-6 pb-1.5 text-[13px] text-muted">{g.note}</li> : null}
            {g.rows.map((row) => {
              if (isDocRow(row.id)) {
                const id = row.id;
                return <DocRow key={id} row={row} slot={slotOf(id)} draft={draft} open={open === id} onToggle={() => toggle(id)} onPick={pick} onPreview={setPreview} />;
              }
              if (row.id === "coverage") return <CoverageRow key={row.id} row={row} draft={draft} clock={clock} />;
              const field = row.id;
              return <FieldRow key={field} row={row} field={field} draft={draft} open={open === field} onToggle={() => toggle(field)} />;
            })}
          </ChecklistGroup>
        );
      })}
      <input ref={picker} type="file" hidden aria-label="Choose a file for one document" data-testid="document-file-input" onChange={(e) => took(e.target.files)} />
      <DocPreviewDrawer draft={draft} slot={preview} onClose={() => setPreview(null)} />
    </Card>
  );
}
