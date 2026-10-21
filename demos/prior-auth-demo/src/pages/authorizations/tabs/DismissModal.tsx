import { useState } from "react";
import { Banner, Button, ChoiceCard, Modal, TextInput } from "@/components/ui";

const REASONS = ["Already handled outside Psyflo", "Not relevant to this request", "The chart does not support it", "Other"];

/** A small dialog that asks why a recommendation is being dismissed. The reason is logged and feeds Analytics. */
export function DismissModal({ titles, gating, onClose, onConfirm }: { titles: string[]; gating: string[]; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState<string | null>(null);
  const [other, setOther] = useState("");
  const ready = reason !== null && (reason !== "Other" || other.trim().length > 0);
  return (
    <Modal
      open onClose={onClose} size="sm" title={titles.length === 1 ? "Dismiss this recommendation?" : `Dismiss ${titles.length} recommendations?`}
      subtitle="Say why. The reason is logged and helps the agents learn what is useful."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!ready} onClick={() => reason && onConfirm(reason === "Other" ? other.trim() : reason)}>Dismiss and log</Button>
        </>
      }
    >
      <ul className="mb-4 list-disc pl-5 text-sm text-ink2">
        {titles.map((t) => <li key={t}>{t}</li>)}
      </ul>
      {gating.length > 0 ? <Banner tone="mid" className="mb-4">{gating.join(" and ")} clears a check that gates Send to payer. Dismissing it leaves that check open. You can bring it back later.</Banner> : null}
      <div role="radiogroup" aria-label="Reason" className="flex flex-col gap-2">
        {REASONS.map((r) => <ChoiceCard key={r} selected={reason === r} onClick={() => setReason(r)} title={r} />)}
      </div>
      {reason === "Other" ? <TextInput className="mt-3" autoFocus value={other} onChange={(e) => setOther(e.target.value)} placeholder="Tell us in a few words" aria-label="Other reason" /> : null}
    </Modal>
  );
}
