import { useState } from "react";
import { Button, Field, Modal, TextArea } from "@/components/ui";
import type { ReferralCheck } from "@/data/referrals";
import { useStore } from "@/store";

/** Gate: a person accepts a finding as it is. The reason is required and goes on the timeline. */
export function OverrideModal({ id, check, onClose }: { id: string; check: ReferralCheck; onClose: () => void }) {
  const override = useStore((s) => s.overrideReferralCheck);
  const [reason, setReason] = useState("");
  const ok = reason.trim().length >= 5;
  return (
    <Modal
      open
      onClose={onClose}
      title="Override with a reason"
      subtitle={check.label}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!ok} onClick={() => { override(id, check.key, reason.trim()); onClose(); }}>Override finding</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-xl bg-tile px-4 py-3 text-sm text-ink2">Reader found: {check.detail}</div>
        <Field label="Reason" required hint="Logged with your name on the activity timeline.">
          <TextArea autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is it fine to go ahead?" />
        </Field>
      </div>
    </Modal>
  );
}
