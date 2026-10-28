import { useState } from "react";
import { ArrowRight, CircleCheck, FilePenLine, PenLine, Save, Undo2 } from "lucide-react";
import { Banner, Button, Field, Modal, TextArea } from "@/components/ui";
import type { Blocker } from "@/data/assess/completion";
import type { InstrumentInstance, ModuleId } from "@/data/assess/types";
import type { IntakeRecord } from "@/data/intake/types";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import { SignOffDialog } from "../shared/SignOff";

/** The module's sticky action bar. Everything saves as the person types; "Save draft" says so out loud. A module is marked ready or signed only when its
    required fields are filled and no evidence waits for a decision, and when it is not, the bar lists what is in the way. Only a qualified clinician signs. */
export function ModuleFooter({ record, moduleId, label, inst, blockers, continueLabel, onContinue, onGoBlocker }: {
  record: IntakeRecord; moduleId: ModuleId; label: string; inst: InstrumentInstance | undefined; blockers: Blocker[];
  continueLabel: string; onContinue: () => void; onGoBlocker: (b: Blocker) => void;
}) {
  const ready = useStore((s) => s.markInstrumentReady);
  const reopen = useStore((s) => s.reopenInstrument);
  const sign = useStore((s) => s.signInstrument);
  const amend = useStore((s) => s.amendInstrument);
  const toast = useStore((s) => s.toast);
  const [attempt, setAttempt] = useState<"ready" | "sign" | null>(null);
  const [signing, setSigning] = useState(false);
  const [amending, setAmending] = useState(false);
  const [reason, setReason] = useState("");
  const status = inst?.status ?? "not_started";

  const tryReady = () => {
    if (blockers.length) return setAttempt("ready");
    setAttempt(null);
    if (ready(record.id, moduleId)) toast({ title: "Marked ready for review", body: `${label} waits for a clinician to review and sign it.`, tone: "good" });
  };
  const trySign = () => {
    if (blockers.length) return setAttempt("sign");
    setAttempt(null);
    setSigning(true);
  };
  const saveDraft = () => {
    (document.activeElement as HTMLElement | null)?.blur();
    toast({ title: "Draft saved", body: inst ? `${label}, saved ${stamp(inst.updatedAt)}. Everything also saves as you type.` : "Nothing is entered yet.", tone: "neutral" });
  };

  return (
    <div className="sticky bottom-3 z-20 space-y-2" data-module-footer>
      {attempt && blockers.length ? (
        <Banner tone="mid" title={attempt === "sign" ? "It cannot be signed yet" : "It is not ready for review yet"} action={<Button size="sm" onClick={() => setAttempt(null)}>Close</Button>}>
          <ul className="mt-1 space-y-1">
            {blockers.map((b) => (
              <li key={`${b.kind}-${b.label}`} className="flex flex-wrap items-center gap-2">
                <span>{b.label}</span>
                <button type="button" onClick={() => onGoBlocker(b)} className="text-[12px] font-semibold text-forest hover:underline">Go to it</button>
              </li>
            ))}
          </ul>
        </Banner>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[20px] border border-edge bg-white px-5 py-3">
        <p className="flex items-center gap-1.5 text-[13px] text-muted" data-autosave>
          <CircleCheck size={15} className="ico text-good" aria-hidden="true" />
          {inst ? `Autosaved ${stamp(inst.updatedAt)}` : "Autosaves as you type"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {status === "signed" ? (
            <Button icon={FilePenLine} onClick={() => setAmending(true)}>Amend</Button>
          ) : (
            <>
              <Button icon={Save} onClick={saveDraft}>Save draft</Button>
              {status === "awaiting_review" ? <Button icon={Undo2} onClick={() => reopen(record.id, moduleId)}>Return to editing</Button> : <Button onClick={tryReady}>Mark ready for review</Button>}
              <Button variant="primary" icon={PenLine} onClick={trySign}>Sign</Button>
            </>
          )}
          <Button variant={status === "signed" ? "primary" : "outline"} trailing={ArrowRight} onClick={onContinue} title={continueLabel} aria-label={continueLabel}>Continue</Button>
        </div>
      </div>

      <SignOffDialog
        open={signing} onClose={() => setSigning(false)} record={record} title={`Sign ${label}`} signLabel="Sign"
        attestation="I reviewed this assessment and its evidence. The clinical content is mine, and each AI suggestion in it was accepted, edited or rejected by a person."
        onSign={(signer, rolePlay) => {
          const ok = sign(record.id, moduleId, signer.id, rolePlay);
          toast(ok ? { title: `${label} signed`, body: `Version ${inst?.version ?? 1}, signed by ${signer.name}${rolePlay ? " (demo role-play)" : ""}.`, tone: "good" } : { title: "It was not signed", body: "A qualified clinician signs, with every required field filled and no evidence waiting.", tone: "risk" });
        }}
      />
      <Modal
        open={amending} onClose={() => setAmending(false)} title={`Amend ${label}`} subtitle={`Starts version ${(inst?.version ?? 1) + 1}. Version ${inst?.version ?? 1} is kept as it was signed.`}
        footer={
          <>
            <Button onClick={() => setAmending(false)}>Cancel</Button>
            <Button
              variant="primary" icon={FilePenLine} disabled={!reason.trim()}
              onClick={() => {
                amend(record.id, moduleId, reason);
                toast({ title: `Version ${(inst?.version ?? 1) + 1} started`, body: `Version ${inst?.version ?? 1} is kept as it was signed.`, tone: "neutral" });
                setReason("");
                setAmending(false);
              }}
            >
              Start new version
            </Button>
          </>
        }
      >
        <Field label="Why is it being amended?" required>
          <TextArea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="For example, new information from the patient" />
        </Field>
      </Modal>
    </div>
  );
}
