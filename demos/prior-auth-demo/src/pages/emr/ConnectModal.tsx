import { useState } from "react";
import { Button, ChoiceCard, Field, Modal, Stepper, TextInput } from "@/components/ui";
import { SYSTEM_KINDS, type SystemKind } from "@/data/emr";
import { SITE_IDS, siteName, sitesLabel, type SiteId } from "@/data/sites";
import { useScope } from "@/lib/scope";
import { useStore } from "@/store";
import { CONNECT_CHECKS, ConnectionTest } from "./ConnectionTest";

const STEPS = ["System", "Contact", "Test"];

/** Guided set-up in three steps: what kind of system, who at the practice can approve it, then a read-only test. Mounted only while open. */
export function ConnectModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<SystemKind>("Clinical record");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [passed, setPassed] = useState(false);
  const [error, setError] = useState("");
  const { sites: inView, viewer } = useScope();
  // A system serves the sites chosen here, from the sites this viewer may see. The choice starts at the sites in view.
  const [sites, setSites] = useState<SiteId[]>(inView);
  const choices: { label: string; sites: SiteId[] }[] = [...viewer.sites.map((id) => ({ label: siteName(id), sites: [id] })), ...(viewer.sites.length > 1 ? [{ label: "Both sites", sites: [...SITE_IDS] }] : [])];
  const holds = SYSTEM_KINDS.find((k) => k.value === kind)?.holds ?? "";
  const finalName = name.trim() || `${kind} · ${sitesLabel(sites)}`;

  const next = () => {
    if (step === 1 && !contact.trim()) return setError("Add the person at the practice who can approve read-only access.");
    setError("");
    setStep((s) => s + 1);
  };
  const finish = () => {
    useStore.getState().connectSystem({ kind, name: finalName, holds, contact: contact.trim(), sites });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Connect a system" subtitle="Read-only. Nothing is written back until a person approves it." footer={
      <>
        {step > 0 && step < 2 ? <Button onClick={() => setStep(step - 1)}>Back</Button> : null}
        <Button onClick={onClose}>Cancel</Button>
        {step < 2 ? <Button variant="primary" onClick={next}>{step === 1 ? "Run the connection test" : "Next"}</Button> : <Button variant="primary" disabled={!passed} onClick={finish}>Connect {finalName}</Button>}
      </>
    }>
      <div className="flex flex-col gap-5">
        <Stepper steps={STEPS} current={step} />
        {step === 0 ? (
          <div className="flex flex-col gap-3">
            <div role="radiogroup" aria-label="System type" className="grid grid-cols-2 gap-2.5">
              {SYSTEM_KINDS.map((k) => <ChoiceCard key={k.value} selected={kind === k.value} onClick={() => setKind(k.value)} title={k.value}>{k.holds}</ChoiceCard>)}
            </div>
            {choices.length > 1 ? (
              <div role="radiogroup" aria-label="Site" className="grid grid-cols-3 gap-2.5">
                {choices.map((c) => <ChoiceCard key={c.label} selected={sitesLabel(sites) === c.label} onClick={() => setSites(c.sites)} title={c.label} />)}
              </div>
            ) : (
              <p className="text-[13px] text-muted">It will serve {sitesLabel(viewer.sites)}, the only site your role can see.</p>
            )}
            <Field label="Name in Psyflo" hint="Shown in Connection health."><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder={`${kind} · ${sitesLabel(sites)}`} /></Field>
          </div>
        ) : null}
        {step === 1 ? (
          <div className="flex flex-col gap-3">
            <Field label="Contact at the practice" required error={error} hint="Someone who can approve read-only access and answer questions."><TextInput value={contact} onChange={(e) => { setContact(e.target.value); setError(""); }} placeholder="Name and role, for example Dana Ruiz, practice manager" /></Field>
            <p className="text-[13px] text-muted">We email them a read-only access request. Until they approve it, the test below uses a demo record.</p>
          </div>
        ) : null}
        {step === 2 ? <ConnectionTest checks={CONNECT_CHECKS} onPassed={() => setPassed(true)} /> : null}
      </div>
    </Modal>
  );
}
