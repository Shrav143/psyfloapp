import { Drawer } from "@/components/ui";
import type { EditLogEntry } from "@/data/payerConfig";
import { AuditList } from "./history/AuditList";

/** Every edit to a workflow, rule, script, document list or payer detail, with who, when, why, the old text and the new text, and a filter by area. */
export function EditLogDrawer({ name, edits, onClose }: { name: string; edits: EditLogEntry[]; onClose: () => void }) {
  return (
    <Drawer open onClose={onClose} width={680} title="Edit log" subtitle={`Every edit to ${name}, newest first`}>
      <AuditList edits={edits} />
    </Drawer>
  );
}
