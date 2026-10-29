import { useState } from "react";
import { Button, Checkbox, Field, Modal, TextArea } from "@/components/ui";
import type { PriorAssessment } from "@/data/assess/types";
import type { IntakeRecord } from "@/data/intake/types";
import { longDate } from "@/lib/time";
import { useStore } from "@/store";
import { REUSE_LABEL, releaseStatus } from "./priorModel";

const RELEASE_TEXT = { on_file: "The consent ledger lists a release of information on file.", needed: "The consent ledger has no release of information on file for this source.", unknown: "This record has no consent ledger entries, so Psyflo cannot tell whether a release is on file." };

/** Reuse as a starting point depends on policy, consent and clinical appropriateness. The person confirms each, and nothing is signed. */
export function ReuseModal({ record, prior, onClose }: { record: IntakeRecord; prior: PriorAssessment; onClose: () => void }) {
  const reuse = useStore((s) => s.reusePrior);
  const [consent, setConsent] = useState(false);
  const [fit, setFit] = useState(false);
  const [attest, setAttest] = useState(false);
  const release = releaseStatus(record);
  const label = `Carried forward from ${longDate(prior.date)}, needs review`;
  return (
    <Modal
      open
      onClose={onClose}
      title="Reuse as a starting point"
      subtitle={`${prior.label} · ${prior.provider}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!(consent && fit && attest)} onClick={() => { reuse(record.id, prior.id); onClose(); }}>Carry forward as a draft</Button>
        </>
      }
    >
      <div className="space-y-3" data-reuse-modal>
        <p className="text-[14px] text-ink">This starts a new draft version labeled “{label}”. Nothing is signed, and a person reviews every carried-forward entry before the assessment is signed.</p>
        <ul className="space-y-1 text-[13px] text-ink2">
          <li><span className="font-semibold text-ink">Policy.</span> {REUSE_LABEL[prior.reuse]}.</li>
          <li><span className="font-semibold text-ink">Consent.</span> {RELEASE_TEXT[release]}</li>
        </ul>
        <div className="space-y-2.5">
          <Checkbox checked={consent} onChange={setConsent} label={<span className="text-[14px]">A release or consent covers reusing this assessment from {prior.provider}.</span>} />
          <Checkbox checked={fit} onChange={setFit} label={<span className="text-[14px]">I reviewed it and it is clinically appropriate to start from for this person now.</span>} />
          <Checkbox checked={attest} onChange={setAttest} label={<span className="text-[14px]">I understand reuse never signs anything and each entry needs review.</span>} />
        </div>
      </div>
    </Modal>
  );
}

const REASONS = ["No release of information for the source", "The assessment is outdated", "The person's circumstances changed", "The source's format cannot be verified"];

/** The assessment cannot be reused: the reason is required and kept. */
export function CannotReuseModal({ record, prior, onClose }: { record: IntakeRecord; prior: PriorAssessment; onClose: () => void }) {
  const mark = useStore((s) => s.markPriorNotReusable);
  const [reason, setReason] = useState("");
  return (
    <Modal
      open
      onClose={onClose}
      title="Cannot reuse"
      subtitle={`${prior.label} · ${prior.provider}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!reason.trim()} onClick={() => { mark(record.id, prior.id, reason); onClose(); }}>Record the reason</Button>
        </>
      }
    >
      <div className="space-y-3" data-cannot-reuse-modal>
        <div className="flex flex-wrap gap-1.5">
          {REASONS.map((r) => (
            <button key={r} type="button" onClick={() => setReason(r)} className="rounded-full bg-neutral-bg px-2.5 py-[3px] text-[12px] font-semibold text-neutral-ink hover:bg-tile">{r}</button>
          ))}
        </div>
        <Field label="Reason"><TextArea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why it cannot be reused" /></Field>
      </div>
    </Modal>
  );
}
