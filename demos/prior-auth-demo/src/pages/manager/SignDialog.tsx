import { useState, type ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { Banner, Button, Checkbox, Dropdown, Field, Modal } from "@/components/ui";
import { Portal } from "@/pages/dashboard/Portal";

const CLINICIANS = [
  { value: "Heather K., LISW-S", label: "Heather K., LISW-S", hint: "Clinical director" },
  { value: "Dr. R. Lindqvist, MD", label: "Dr. R. Lindqvist, MD", hint: "Medical director" },
];

interface Props {
  title: string;
  subtitle?: string;
  attestation: string;
  confirmLabel: string;
  /** An ochre warning the signer must read and accept before signing. */
  warning?: string;
  children?: ReactNode;
  onClose: () => void;
  onSign: (signedBy: string) => void;
}

/** Sign-off gate. Agents stop here: only a licensed clinician signs, and only after ticking the attestation. */
export function SignDialog({ title, subtitle, attestation, confirmLabel, warning, children, onClose, onSign }: Props) {
  const [who, setWho] = useState(CLINICIANS[0].value);
  const [attested, setAttested] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const ready = attested && (!warning || accepted);
  return (
    <Portal>
    <Modal
      open
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={ShieldCheck} disabled={!ready} onClick={() => onSign(who)}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {children}
        <Banner title="Only a licensed clinician signs">You are signed in as Jordan Perez, a UR coordinator. Choose the clinician who is signing. Agents never sign for a person.</Banner>
        <Field label="Signing clinician" required>
          <Dropdown variant="field" ariaLabel="Signing clinician" value={who} options={CLINICIANS} onChange={setWho} />
        </Field>
        {warning ? (
          <div className="rounded-2xl border border-mid-edge bg-mid-bg px-4 py-3 text-sm text-mid-ink">
            <div className="mb-2 font-semibold">One check needs a look</div>
            <p className="mb-2.5">{warning}</p>
            <Checkbox checked={accepted} onChange={setAccepted} label="I read this and I accept it" />
          </div>
        ) : null}
        <Checkbox checked={attested} onChange={setAttested} label={attestation} />
      </div>
    </Modal>
    </Portal>
  );
}
