import { useMemo, useRef, useState, type ReactNode } from "react";
import { Card, ChecklistGroup } from "@/components/ui";
import type { CaseDraft, DocSlotId } from "@/data/cases";
import { uid } from "@/lib/format";
import { useStore } from "@/store";
import { DocPreviewDrawer } from "./DocPreviewDrawer";
import { DocRow } from "./DocRow";
import { makeDocument, unreadDocument } from "./documents";
import { FieldRow } from "./FieldRow";
import { usePayerContext } from "./payerContext";
import { buildChecklist, isDocRow, slotOf, tally, type Group, type RowId } from "./recordsModel";

/** The checklist of Clinical documentation in one card: the clinical summary and the documents. Only one editor is open at a time. `rows` can leave rows out of a group. */
export function RecordsChecklist({ draft, groups: ids, rows: keep, header }: { draft: CaseDraft; groups: Group["id"][]; rows?: readonly string[]; /** Sits at the top of the card: the readiness line. */ header?: ReactNode }) {
  const intake = useStore((s) => s.intakes.find((r) => r.id === draft.intakeId));
  const put = useStore((s) => s.putCaseDocs);
  const [open, setOpen] = useState<RowId | null>(null);
  const [preview, setPreview] = useState<DocSlotId | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const pickFor = useRef<{ slot: DocSlotId; replace: boolean } | null>(null);
  const ctx = usePayerContext(draft);

  const groups = useMemo(
    () => buildChecklist(draft, intake, ctx).filter((g) => ids.includes(g.id)).map((g) => (keep ? { ...g, rows: g.rows.filter((r) => keep.includes(r.id)) } : g)),
    [draft, intake, ctx, ids, keep],
  );
  const toggle = (id: RowId) => setOpen((cur) => (cur === id ? null : id));

  const pick = (slot: DocSlotId, replace = false) => {
    pickFor.current = { slot, replace };
    picker.current?.click();
  };
  /** A file chosen for a row. When it replaces one, Reader reads it again and the demo reads it clean. */
  const took = (list: FileList | null) => {
    const file = list?.[0];
    const target = pickFor.current;
    const demo = file ? { id: uid("f"), name: file.name, sizeKb: Math.max(1, Math.round(file.size / 1024)) } : null;
    /* A request from an intake keeps a file by name and type only: Reader does not read it, and no check is made up for it. */
    if (demo && target) put(draft.id, [draft.intakeId ? unreadDocument(target.slot, demo) : makeDocument(target.slot, demo, false, "validating", target.replace)]);
    if (picker.current) picker.current.value = "";
  };

  return (
    <Card>
      {header ? <div className="px-5 pt-4 pb-4">{header}</div> : null}
      {groups.map((g) => {
        const count = tally([g]);
        return (
          <ChecklistGroup key={g.id} title={g.title} done={count.done} total={count.total}>
            {g.note ? <li className="px-6 pb-1.5 text-[13px] text-mid-ink">{g.note}</li> : null}
            {g.rows.map((row) => {
              if (isDocRow(row.id)) {
                const id = row.id;
                return <DocRow key={id} row={row} slot={slotOf(id)} draft={draft} open={open === id} onToggle={() => toggle(id)} onPick={pick} onPreview={setPreview} />;
              }
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
