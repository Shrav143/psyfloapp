import { useState } from "react";
import { Button, ChoiceCard, Modal } from "@/components/ui";
import type { FocusId } from "@/data/caseDetail";
import { FOCUS, FOCUS_IDS } from "@/data/caseDetailFocus";

/** A small panel: pick what matters most. The cards are put in that order and one that fits the focus may be added (see caseDetailFocus.ts). */
export function RefineModal({ current, onClose, onApply }: { current: FocusId | null; onClose: () => void; onApply: (focus: FocusId) => void }) {
  const [pick, setPick] = useState<FocusId | null>(current);
  return (
    <Modal
      open onClose={onClose} size="sm" title="Refine recommendations"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={pick === null || pick === current} onClick={() => pick && onApply(pick)}>Apply focus</Button></>}
    >
      <div role="radiogroup" aria-label="Focus" className="flex flex-col gap-2">
        {FOCUS_IDS.map((id) => <ChoiceCard key={id} selected={pick === id} onClick={() => setPick(id)} title={FOCUS[id].label} className="px-4 py-3" />)}
      </div>
    </Modal>
  );
}
