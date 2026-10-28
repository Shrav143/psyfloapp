import { useState } from "react";
import { CircleCheck, Layers, PenLine, SendHorizontal } from "lucide-react";
import { Banner, Button, Card, CardBody, CardHeader, Field, Modal, Pill, TextArea } from "@/components/ui";
import type { CansAssessment, IntakeRecord } from "@/data/intake/types";
import { longDate, stamp } from "@/lib/time";
import { useStore } from "@/store";
import { actorName } from "../shared/provenance";
import { SignOffDialog } from "../shared/SignOff";
import { ASSESSOR_PER_POLICY, CANS_STATUS_LABEL, PLACEHOLDER_WARNING } from "./cansModel";
import { cansBlockers, type CansBlocker } from "./cansState";

const TAB_OF: Record<CansBlocker["id"], "items" | "evidence" | "summary"> = { template: "items", items: "items", evidence: "evidence", assessor: "summary", summary: "summary" };

/** Sign-off for the CANS record: what blocks it, ready for review, the qualified clinician's signature through the one sign-off gate, new versions and the version history. */
export function SignCard({ record, cans, onGo }: { record: IntakeRecord; cans: CansAssessment; onGo: (tab: "items" | "evidence" | "summary") => void }) {
  const ready = useStore((s) => s.markCansReady);
  const sign = useStore((s) => s.signCans);
  const [signing, setSigning] = useState(false);
  const [amending, setAmending] = useState(false);
  const blockers = cansBlockers(record);
  const signed = cans.status === "signed";
  const version = cans.version ?? 1;
  return (
    <Card data-cans-sign>
      <CardHeader title="Sign-off" subtitle={`Version ${version}${cans.carriedFrom ? ` · Carried forward from ${longDate(cans.carriedFrom.date)}, needs review` : ""}`} right={<Pill tone={signed ? "good" : cans.status === "ready_for_review" ? "mid" : "neutral"}>{CANS_STATUS_LABEL[cans.status]}</Pill>} />
      <CardBody className="space-y-3">
        {signed ? (
          <Banner tone="good" icon={CircleCheck} title={`Signed by ${cans.signedBy ? actorName(cans.signedBy) : "a clinician"}${cans.signedAt !== undefined ? ` · ${stamp(cans.signedAt)}` : ""}${cans.rolePlay ? " (demo role-play)" : ""}`}>
            {PLACEHOLDER_WARNING} The items are read-only. Starting a new version keeps this one.
          </Banner>
        ) : (
          <>
            <p className="text-[13px] text-ink2">{PLACEHOLDER_WARNING} {ASSESSOR_PER_POLICY}. Only a qualified clinician signs; agents cannot.</p>
            {blockers.length ? (
              <div data-cans-blockers>
                <p className="text-[13px] font-semibold text-ink2">Before it can go to review or be signed</p>
                <ul className="mt-1 space-y-1">
                  {blockers.map((b) => (
                    <li key={b.id} className="flex flex-wrap items-center gap-2 text-[13px] text-ink">
                      <span>{b.label}</span>
                      <button type="button" className="text-[12px] font-semibold text-forest hover:underline" onClick={() => onGo(TAB_OF[b.id])}>Go there</button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-[13px] text-good-ink">Every item is addressed and every proposal has a decision.</p>
            )}
          </>
        )}
        <div className="flex flex-wrap gap-2">
          {!signed ? (
            <>
              <Button icon={SendHorizontal} disabled={!!blockers.length || cans.status === "ready_for_review"} onClick={() => ready(record.id)}>{cans.status === "ready_for_review" ? "Ready for review" : "Mark ready for review"}</Button>
              <Button variant="primary" icon={PenLine} disabled={!!blockers.length} onClick={() => setSigning(true)}>Sign the CANS record</Button>
            </>
          ) : (
            <Button icon={Layers} onClick={() => setAmending(true)}>Start a new version</Button>
          )}
        </div>
        {cans.history?.length ? (
          <div data-cans-history>
            <p className="text-[13px] font-semibold text-ink2">Version history</p>
            <ul className="mt-1 space-y-1">
              {[...cans.history].reverse().map((h) => (
                <li key={h.version} className="text-[13px] text-ink2">
                  <span className="font-medium text-ink">Version {h.version}</span> · {h.signedBy ? `signed by ${actorName(h.signedBy)}${h.signedAt !== undefined ? `, ${stamp(h.signedAt)}` : ""}${h.rolePlay ? " (demo role-play)" : ""}` : "not signed"} · replaced {stamp(h.supersededAt)}{h.note ? `: ${h.note}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardBody>
      <SignOffDialog
        open={signing}
        onClose={() => setSigning(false)}
        record={record}
        title="Sign the CANS record"
        attestation="I reviewed the rating labels, notes and evidence. This is a demo placeholder assessment, not an official CANS Lifetime assessment."
        signLabel="Sign"
        onSign={(signer, rolePlay) => { sign(record.id, signer.id, rolePlay); }}
      />
      {amending ? <AmendModal record={record} onClose={() => setAmending(false)} /> : null}
    </Card>
  );
}

function AmendModal({ record, onClose }: { record: IntakeRecord; onClose: () => void }) {
  const amend = useStore((s) => s.amendCans);
  const [reason, setReason] = useState("");
  return (
    <Modal
      open
      onClose={onClose}
      title="Start a new version"
      subtitle="The signed version stays in the history"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!reason.trim()} onClick={() => { amend(record.id, reason); onClose(); }}>Start version {(record.cans?.version ?? 1) + 1}</Button>
        </>
      }
    >
      <Field label="Why a new version is needed"><TextArea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example, the person's circumstances changed" /></Field>
    </Modal>
  );
}
