import { useState, type ReactNode } from "react";
import { Button, Field, Modal, TextInput } from "@/components/ui";

/** Every payer edit asks for a reason before it is saved and logged. Mounted only while open.
    `valid` lets the form keep a save from going through while one of its own fields shows an error. */
export function ReasonModal({ title, subtitle, children, saveLabel = "Save and log the edit", size = "md", valid = true, onClose, onSave }: { title: string; subtitle?: string; children?: ReactNode; saveLabel?: string; size?: "sm" | "md" | "lg"; valid?: boolean; onClose: () => void; onSave: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const [missing, setMissing] = useState(false);
  const save = () => {
    if (!valid) return;
    if (!reason.trim()) {
      setMissing(true);
      return;
    }
    onSave(reason.trim());
  };
  return (
    <Modal open size={size} onClose={onClose} title={title} subtitle={subtitle} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>{saveLabel}</Button></>}>
      <div className="flex flex-col gap-4">
        {children}
        <Field label="Reason for the edit" required error={missing ? "Add a reason. It goes in the edit log." : undefined} hint="Saved with your name, the time, the old text and the new text.">
          <TextInput value={reason} onChange={(e) => { setReason(e.target.value); setMissing(false); }} placeholder="For example: Sentara confirmed the new window on a call" />
        </Field>
      </div>
    </Modal>
  );
}
