import { Drawer, DocumentSheet } from "@/components/ui";
import type { CaseDraft, DocSlotId } from "@/data/cases";
import { previewBlocks, slotDef } from "./documents";

/** A page-sized look at one chart document, with the cited passage boxed when it was opened from a source chip. */
export function DocPreviewDrawer({ draft, slot, highlight, onClose }: { draft: CaseDraft; slot: DocSlotId | null; highlight?: boolean; onClose: () => void }) {
  const doc = slot ? draft.documents.find((d) => d.slot === slot) : undefined;
  return (
    <Drawer open={!!slot} onClose={onClose} title={slot ? slotDef(slot).label : ""} subtitle={doc ? `${doc.file.name} · ${doc.file.sizeKb} KB` : "Not added yet"} width={600}>
      {slot ? <DocumentSheet blocks={previewBlocks(slot, draft.patient.initials || "Patient", doc?.file.name ?? slotDef(slot).sampleName)} highlightId={highlight ? "evidence" : null} page={1} pages={3} /> : null}
    </Drawer>
  );
}
