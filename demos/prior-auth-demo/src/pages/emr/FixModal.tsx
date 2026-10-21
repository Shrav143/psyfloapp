import { useState } from "react";
import { Button, Checkbox, Field, Modal, Stepper, TextInput } from "@/components/ui";
import type { EmrSystem } from "@/data/emr";
import { useStore } from "@/store";
import { ConnectionTest } from "./ConnectionTest";

const STEPS = ["What happened", "Renew access", "Test"];
const CHECKS = ["Signing in with the new read-only access", "Reading the latest remittance", "Matching it to a claim"];

interface Props {
  system: EmrSystem;
  onClose: () => void;
  /** Reconnect runs the same walk-through, then goes on to its own test instead of connecting at once. The caller keeps the flow going. */
  onFinish?: () => void;
  finishLabel?: string;
}

/** A short walk-through for a system that needs a quick look: say what happened, renew the sign-in, test it. Mounted only while open. */
export function FixModal({ system, onClose, onFinish, finishLabel = "Finish and reconnect" }: Props) {
  const [step, setStep] = useState(0);
  const [approver, setApprover] = useState(system.contact);
  const [ok, setOk] = useState(false);
  const [passed, setPassed] = useState(false);
  const [error, setError] = useState("");
  const next = () => {
    if (step === 1 && (!approver.trim() || !ok)) return setError("Name the person who approves and confirm read-only access.");
    setError("");
    setStep((s) => s + 1);
  };
  return (
    <Modal open onClose={onClose} title={`Fix ${system.name.toLowerCase()}`} subtitle="Three short steps. Nothing is written to the system." footer={
      <>
        <Button onClick={onClose}>Cancel</Button>
        {step < 2 ? <Button variant="primary" onClick={next}>{step === 1 ? "Renew and test" : "Next"}</Button> : <Button variant="primary" disabled={!passed} onClick={() => { if (onFinish) return onFinish(); useStore.getState().fixSystem(system.id); onClose(); }}>{finishLabel}</Button>}
      </>
    }>
      <div className="flex flex-col gap-5">
        <Stepper steps={STEPS} current={step} />
        {step === 0 ? (
          <div className="flex flex-col gap-3 text-sm">
            <p className="rounded-2xl bg-mid-bg px-4 py-3 text-mid-ink">{system.fixIssue ?? system.issue}</p>
            <p className="text-ink2">This is usually an expired sign-in. The first step is to renew the read-only access. The agents then pull the missed remittances.</p>
          </div>
        ) : null}
        {step === 1 ? (
          <div className="flex flex-col gap-3.5">
            <Field label="Who approves the new sign-in" required error={error}><TextInput value={approver} onChange={(e) => { setApprover(e.target.value); setError(""); }} /></Field>
            <Checkbox checked={ok} onChange={(v) => { setOk(v); setError(""); }} label="I confirm the agents may read claims and remittances. They cannot change them." />
          </div>
        ) : null}
        {step === 2 ? <ConnectionTest checks={CHECKS} onPassed={() => setPassed(true)} /> : null}
      </div>
    </Modal>
  );
}
