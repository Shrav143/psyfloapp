import { useState } from "react";
import { PenLine, Send } from "lucide-react";
import { Button, Checkbox, Modal } from "@/components/ui";
import { CLINICIAN_AT, staffOf } from "@/data/intake/seed";
import type { IntakeRecord, IntakeStaff } from "@/data/intake/types";
import { useStore } from "@/store";
import { meOf } from "@/store/intake";

/* The one sign-off gate for the Intake workspace (assessment attestation, CANS signature, Level of Need disposition, pathway selection,
   handoff approval). Only a qualified clinician signs. When the viewer is not one, the dialog offers to send it for signature, or,
   as a clearly labeled demo control, to play the site's clinician so the scenario can continue. No agent can sign. */

export function SignOffDialog({ open, onClose, record, title, attestation, signLabel = "Sign", onSign }: {
  open: boolean;
  onClose: () => void;
  record: IntakeRecord;
  /** "Sign the clinical assessment" */
  title: string;
  /** What the signer attests to, in the first person. */
  attestation: string;
  signLabel?: string;
  /** Called with the person who signed and whether it was demo role-play. */
  onSign: (signer: IntakeStaff, rolePlay: boolean) => void;
}) {
  const me = useStore((s) => meOf(s));
  const addAudit = useStore((s) => s.addIntakeAudit);
  const toast = useStore((s) => s.toast);
  const [agreed, setAgreed] = useState(false);
  const viewer = staffOf(me);
  const clinician = staffOf(CLINICIAN_AT[record.site]);
  const canSign = !!viewer?.qualified;
  const signer = canSign ? viewer : clinician;
  const close = () => {
    setAgreed(false);
    onClose();
  };
  const sign = (rolePlay: boolean) => {
    if (!signer) return;
    onSign(signer, rolePlay);
    addAudit(record.id, { actor: signer.id, action: `${title}${rolePlay ? " (demo role-play)" : ""}`, detail: signer.credentials });
    close();
  };
  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      subtitle={canSign ? `Signing as ${viewer!.name}${viewer!.credentials ? `, ${viewer!.credentials}` : ""}` : "A qualified clinician signs this. Agents cannot."}
      footer={
        canSign ? (
          <>
            <Button onClick={close}>Cancel</Button>
            <Button variant="primary" icon={PenLine} disabled={!agreed} onClick={() => sign(false)}>{signLabel}</Button>
          </>
        ) : (
          <>
            <Button onClick={close}>Cancel</Button>
            <Button
              icon={Send}
              onClick={() => {
                addAudit(record.id, { actor: me, action: `Sent for signature: ${title.toLowerCase()}`, detail: clinician?.name });
                toast({ title: `Sent to ${clinician?.name ?? "the clinician"}`, body: "It waits for their signature. Nothing is signed yet.", tone: "neutral" });
                close();
              }}
            >
              Send for signature
            </Button>
            <Button variant="primary" icon={PenLine} disabled={!agreed} onClick={() => sign(true)}>Sign as {clinician?.name} (demo)</Button>
          </>
        )
      }
    >
      {!canSign ? (
        <p className="mb-3 rounded-xl bg-mid-bg px-3 py-2 text-[13px] text-mid-ink">
          You are viewing as {viewer?.name ?? "a non-clinician"}, who is not a qualified clinician in this demo. Send it to {clinician?.name}{clinician?.credentials ? `, ${clinician.credentials}` : ""}, or play that clinician to continue the demo. Role-play is recorded as such in the audit trail.
        </p>
      ) : null}
      <Checkbox checked={agreed} onChange={setAgreed} label={<span className="text-[14px]">{attestation}</span>} />
    </Modal>
  );
}
