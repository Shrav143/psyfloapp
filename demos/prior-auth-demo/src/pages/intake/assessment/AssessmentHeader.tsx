import { useState } from "react";
import { CircleAlert, PenLine, RotateCcw, Send } from "lucide-react";
import { Banner, Button, Card, CardBody, CardHeader, Modal, Pill, Segmented, TextArea } from "@/components/ui";
import { staffOf } from "@/data/intake/seed";
import { ASSESSMENT_SECTIONS, type AssessmentMode, type ClinicalAssessment, type IntakeRecord } from "@/data/intake/types";
import type { Tone } from "@/data/types";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import { pendingFor } from "@/store/intake";
import { SignOffDialog } from "../shared/SignOff";
import { actorName } from "../shared/provenance";
import { documented, jumpTo, signBlockers } from "./model";

export const STATUS_META: Record<ClinicalAssessment["status"], { label: string; tone: Tone }> = {
  not_started: { label: "Not started", tone: "neutral" }, in_progress: { label: "In progress", tone: "mid" }, awaiting_review: { label: "Awaiting clinician review", tone: "mid" }, signed: { label: "Signed", tone: "good" },
};
export const ATTESTATION = "I reviewed this assessment. AI-drafted content was reviewed and edited by me.";

/** The assessment's status, its mode (Manual, AI Scribe, Voice guided: switching never loses data), and the sign-off gate. */
export function AssessmentHeader({ record }: { record: IntakeRecord }) {
  const a = record.assessment;
  const st = useStore.getState();
  const [blocked, setBlocked] = useState(false);
  const [signing, setSigning] = useState(false);
  const [amending, setAmending] = useState(false);
  const [reason, setReason] = useState("");
  const meta = STATUS_META[a.status];
  const n = documented(record);
  const pending = pendingFor(record, "assessment");
  const blockers = signBlockers(record);
  const signed = a.status === "signed";
  const signer = a.attestation ? staffOf(a.attestation.by) : undefined;
  const trySign = () => (blockers.length ? setBlocked(true) : setSigning(true));

  return (
    <Card>
      <CardHeader title="Clinical assessment" right={<Pill tone={meta.tone}>{meta.label}</Pill>} />
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[13px] font-medium text-ink2">Mode</span>
          <Segmented<AssessmentMode> items={[{ id: "manual", label: "Manual" }, { id: "scribe", label: "AI Scribe" }, { id: "voice", label: "Voice guided" }]} value={a.mode} onChange={(m) => st.setAssessmentMode(record.id, m)} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
          <span><span className="font-semibold">{n}</span> of {ASSESSMENT_SECTIONS.length} sections documented</span>
          {pending.length ? (
            <button type="button" onClick={() => jumpTo(pending[0].field)} className="font-semibold text-mid-ink hover:underline">
              {pending.length} AI {pending.length === 1 ? "draft" : "drafts"} to review
            </button>
          ) : null}
        </div>
        {signed ? (
          <Banner tone="good" title={`Signed by ${signer?.name ?? actorName(a.attestation?.by ?? "")}${a.attestation?.credentials ? `, ${a.attestation.credentials}` : ""}`}
            action={<Button size="sm" icon={RotateCcw} onClick={() => setAmending(true)}>Amend</Button>}>
            {a.attestation ? `${stamp(a.attestation.at)}${a.attestation.rolePlay ? " (demo role-play)" : ""}. ` : ""}Fields are read-only. Amending reopens the assessment and is kept in the audit trail.
          </Banner>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {a.status !== "awaiting_review" ? <Button icon={Send} disabled={a.status === "not_started"} onClick={() => st.markAssessmentReady(record.id)}>Mark ready for review</Button> : null}
            <Button variant="primary" icon={PenLine} onClick={trySign}>Sign assessment</Button>
            {blockers.length ? <span className="text-[12px] text-muted">{blockers.length} {blockers.length === 1 ? "thing blocks" : "things block"} signing</span> : <span className="text-[12px] text-good-ink">Ready for a clinician to sign</span>}
          </div>
        )}
        {a.amendments?.length ? (
          <ul className="space-y-1 text-[12px] text-muted">
            {a.amendments.map((m, i) => (
              <li key={i}>Amended {stamp(m.at)} by {actorName(m.by)}: {m.reason}{m.priorSigner ? ` (replaced ${actorName(m.priorSigner)}'s signature${m.priorSignedAt !== undefined ? ` of ${stamp(m.priorSignedAt)}` : ""})` : ""}</li>
            ))}
          </ul>
        ) : null}
      </CardBody>

      <Modal open={blocked} onClose={() => setBlocked(false)} title="This assessment cannot be signed yet" footer={<Button onClick={() => setBlocked(false)}>Close</Button>}>
        <p className="text-[14px] text-ink2">A clinician signs only when every AI suggestion is reviewed, a clinician has documented the safety and risk screening, and no safety alert is open.</p>
        <ul className="mt-3 space-y-2">
          {blockers.map((b) => (
            <li key={b.id} className="flex items-start gap-2.5 rounded-xl border border-line px-3 py-2.5">
              <CircleAlert size={16} className="ico mt-0.5 text-mid" aria-hidden="true" />
              <span className="min-w-0 flex-1 text-[14px]">{b.text}</span>
              {b.id !== "empty" ? <Button size="sm" onClick={() => { setBlocked(false); jumpTo(b.field); }}>Go to it</Button> : null}
            </li>
          ))}
        </ul>
      </Modal>

      <SignOffDialog open={signing} onClose={() => setSigning(false)} record={record} title="Sign the clinical assessment" attestation={ATTESTATION} signLabel="Sign assessment"
        onSign={(signer, rolePlay) => st.signAssessment(record.id, signer.id, signer.credentials ?? "", rolePlay)} />

      <Modal open={amending} onClose={() => setAmending(false)} title="Amend the signed assessment" size="sm"
        footer={<><Button onClick={() => setAmending(false)}>Cancel</Button><Button variant="primary" disabled={!reason.trim()} onClick={() => { st.amendAssessment(record.id, reason.trim()); setReason(""); setAmending(false); }}>Reopen for amendment</Button></>}>
        <p className="text-[14px] text-ink2">The signature is withdrawn and kept in the history. A clinician signs again after the change.</p>
        <TextArea className="mt-3" aria-label="Reason for the amendment" placeholder="Why it is being amended" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
      </Modal>
    </Card>
  );
}
