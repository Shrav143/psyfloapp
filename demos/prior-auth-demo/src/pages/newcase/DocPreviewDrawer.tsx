import { Link } from "react-router-dom";
import { Drawer, DocumentSheet } from "@/components/ui";
import { recordDocs } from "@/data/assess/recordDocs";
import type { CaseDraft, DocSlotId } from "@/data/cases";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { previewBlocks, recordPreviewBlocks, slotDef } from "./documents";

/** A page-sized look at one chart document, with the cited passage boxed when it was opened from a source chip.
    A document read from the intake record, or a file added to a request from an intake, shows where it comes from and nothing the demo made up. */
export function DocPreviewDrawer({ draft, slot, highlight, onClose }: { draft: CaseDraft; slot: DocSlotId | null; highlight?: boolean; onClose: () => void }) {
  const doc = slot ? draft.documents.find((d) => d.slot === slot) : undefined;
  const intake = useStore((s) => s.intakes.find((r) => r.id === draft.intakeId));
  const fromRecord = !!doc && (!!doc.from || !!doc.unread) && !!draft.intakeId;
  const src = slot && intake ? recordDocs(intake).find((d) => d.slot === slot) : undefined;
  const who = draft.patient.initials || "Patient";
  return (
    <Drawer open={!!slot} onClose={onClose} title={slot ? slotDef(slot).label : ""} subtitle={doc ? `${doc.file.name} · ${doc.file.sizeKb} KB` : "Not added yet"} width={600}>
      {slot && doc && fromRecord ? <DocumentSheet blocks={recordPreviewBlocks(slot, who, doc)} highlightId={null} page={1} pages={1} /> : slot ? <DocumentSheet blocks={previewBlocks(slot, who, doc?.file.name ?? slotDef(slot).sampleName)} highlightId={highlight ? "evidence" : null} page={1} pages={3} /> : null}
      {slot && intake && doc?.from ? (
        <p className="mt-3 text-[13px]">
          <Link to={paths.intakeRecord(intake.id, src?.module ? `m:${src.module}` : src?.section ?? "documents")} className="font-semibold text-forest hover:underline">Open it in the intake</Link>
        </p>
      ) : null}
    </Drawer>
  );
}
