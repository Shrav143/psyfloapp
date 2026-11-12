import { useState } from "react";
import { createPortal } from "react-dom";
import { Button, Field, Modal, TextArea } from "@/components/ui";
import { canOverride } from "@/data/assess/roles";
import { INTAKE_STAFF, staffOf } from "@/data/intake/seed";

/** Removing a required module is an authorized override: a qualified clinician or the clinic owner, with a reason that is kept on the record. Anyone else is told who can. */
export function OverrideDialog({ open, onClose, moduleLabel, me, onConfirm }: { open: boolean; onClose: () => void; moduleLabel: string; me: string; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const allowed = canOverride(me);
  const who = staffOf(me);
  const close = () => {
    setReason("");
    onClose();
  };
  const confirm = () => {
    onConfirm(reason.trim());
    setReason("");
  };
  return createPortal(
    <Modal
      open={open}
      onClose={close}
      size="sm"
      title={`Remove ${moduleLabel}?`}
      subtitle="This module is required by the configuration."
      footer={
        allowed ? (
          <>
            <Button onClick={close}>Keep it</Button>
            <Button variant="danger" disabled={!reason.trim()} onClick={confirm}>Remove with override</Button>
          </>
        ) : (
          <Button variant="primary" onClick={close}>Close</Button>
        )
      }
    >
      {allowed ? (
        <Field label="Reason for the override" required hint="Recorded with your name in the configuration history and the audit trail.">
          <TextArea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this module not needed for this person?" autoFocus />
        </Field>
      ) : (
        <div className="text-[14px] text-ink2">
          <p>Only an authorized person can remove a required module: a qualified clinician or the clinic owner, with a reason.</p>
          <ul className="mt-3 flex flex-col gap-1 text-[13px]">
            {INTAKE_STAFF.filter((s) => canOverride(s.id)).map((s) => (
              <li key={s.id}><span className="font-medium">{s.name}</span> <span className="text-muted">{s.role}</span></li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] text-muted">You are viewing as {who?.name ?? "a team member"}{who ? ` (${who.role})` : ""}. Switch the viewer in the Demo menu, or ask one of them.</p>
        </div>
      )}
    </Modal>,
    document.body,
  );
}
