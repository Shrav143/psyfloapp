import { useState } from "react";
import { Button, Checkbox, Dropdown, Modal } from "@/components/ui";
import { Labeled } from "./Labeled";
import { sleep } from "@/lib/format";
import { useAlive } from "./lib/useAlive";

const ROLES = [
  { value: "Medical director", label: "Medical director" },
  { value: "Clinical director", label: "Clinical director" },
  { value: "Treating clinician (licensed)", label: "Treating clinician (licensed)" },
];

/** Sign-off gate: a licensed clinician signs before the appeal leaves. Navigator files only after this. */
export function SignModal({ onClose, onSigned }: { onClose: () => void; onSigned: (role: string) => void }) {
  const alive = useAlive();
  const [role, setRole] = useState(ROLES[0].value);
  const [attested, setAttested] = useState(false);
  const [busy, setBusy] = useState(false);
  const sign = async () => {
    setBusy(true);
    await sleep(1100);
    if (alive.current) onSigned(role);
  };
  return (
    <Modal open onClose={busy ? () => undefined : onClose} size="sm" title="Sign and file the appeal" subtitle="Sign-off gate. A licensed clinician signs every appeal." footer={<><Button onClick={onClose} disabled={busy}>Cancel</Button><Button variant="primary" loading={busy} disabled={!attested} onClick={sign}>{busy ? "Navigator is filing" : "Sign and file"}</Button></>}>
      <div className="flex flex-col gap-4">
        <Labeled label="Signing as" required>
          <Dropdown variant="field" value={role} options={ROLES} onChange={setRole} ariaLabel="Signing clinician role" disabled={busy} />
        </Labeled>
        <Checkbox checked={attested} onChange={setAttested} disabled={busy} label="I reviewed this letter against the chart. Every statement is accurate and supported by the evidence attached." />
        <p className="text-[13px] text-muted">Navigator files it through the payer's portal, saves the receipt, and the denial shows as Appeal filed on the Dashboard.</p>
      </div>
    </Modal>
  );
}
