import { useState } from "react";
import { Button, Modal, TextArea } from "@/components/ui";

/** Amending a signed item makes a new version: the signed one is kept in the history and a clinician signs the new one. A reason is required. */
export function AmendDialog({ title, onClose, onConfirm }: { title: string; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={title}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!reason.trim()} onClick={() => { onConfirm(reason.trim()); onClose(); }}>Start a new version</Button>
        </>
      }
    >
      <p className="text-[14px] text-ink2">The signed version is kept. The new version needs a clinician's signature.</p>
      <TextArea className="mt-3" rows={3} aria-label="Reason for the amendment" placeholder="Why it is being amended" value={reason} onChange={(e) => setReason(e.target.value)} />
    </Modal>
  );
}
