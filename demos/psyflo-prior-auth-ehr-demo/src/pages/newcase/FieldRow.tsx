import { useId } from "react";
import { Button, ChecklistItem } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { FieldEditor } from "./RecordEditors";
import type { FieldId, Row } from "./recordsModel";

/** A row for something typed or read from a file. The button opens the editor under the row; the label is the button's description, not part of its name. */
export function FieldRow({ row, field, draft, open, onToggle }: { row: Row; field: FieldId; draft: CaseDraft; open: boolean; onToggle: () => void }) {
  const labelId = useId();
  const has = row.state === "done" || row.state === "warn";
  return (
    <ChecklistItem
      state={row.state}
      label={<span id={labelId}>{row.label}</span>}
      tag={row.tag}
      detail={row.quiet ? <span className="text-muted">{row.detail}</span> : row.detail}
      action={
        <Button size="sm" variant={has ? "ghost" : "outline"} aria-expanded={open} aria-describedby={labelId} onClick={onToggle}>
          {has ? "Edit" : "Add"}
        </Button>
      }
    >
      {open ? <FieldEditor id={field} draft={draft} close={onToggle} /> : null}
    </ChecklistItem>
  );
}
