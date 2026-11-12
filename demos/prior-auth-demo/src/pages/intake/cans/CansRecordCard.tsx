import { useState } from "react";
import { BadgeCheck } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Field, Modal, TextInput } from "@/components/ui";
import { INTAKE_STAFF, staffOf } from "@/data/intake/seed";
import type { CansAssessment, IntakeRecord } from "@/data/intake/types";
import { longDate, stamp } from "@/lib/time";
import { useStore } from "@/store";
import { actorName } from "../shared/provenance";
import { ASSESSOR_PER_POLICY, fromIso, isoOf, REASSESS_PENDING } from "./cansModel";
import { Facts, Select } from "./ui";

const CRED_LABEL: Record<CansAssessment["credentialStatus"], string> = { not_checked: "Not checked", verified: "License confirmed by staff", unverified: "Could not confirm" };

/** Who assesses, when, and the credential check. The assessor's qualifications come from DMAS policy, which is not loaded: a person may record that they checked a license, which is not a DMAS qualification decision. */
export function CansRecordCard({ record, cans }: { record: IntakeRecord; cans: CansAssessment }) {
  const setDetails = useStore((s) => s.setCansDetails);
  const [cred, setCred] = useState(false);
  const locked = cans.status === "signed";
  const assessor = cans.assessor ? staffOf(cans.assessor) : undefined;
  return (
    <Card data-cans-record>
      <CardHeader title="Assessment record" subtitle={ASSESSOR_PER_POLICY} />
      <CardBody className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Assessor">
            <Select
              label="Assessor" value={cans.assessor ?? ""} disabled={locked} onChange={(v) => setDetails(record.id, { assessor: v || undefined })}
              options={[{ value: "", label: "Not assigned" }, ...INTAKE_STAFF.map((s) => ({ value: s.id, label: `${s.name}, ${s.role}` }))]}
            />
          </Field>
          <Field label="Assessment date">
            <TextInput type="date" value={cans.date !== undefined ? isoOf(cans.date) : ""} disabled={locked} onChange={(e) => setDetails(record.id, { date: fromIso(e.target.value) ?? undefined })} aria-label="Assessment date" />
          </Field>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line px-3.5 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-ink">Assessor credentials</p>
            <p className="text-[12px] text-muted">
              {CRED_LABEL[cans.credentialStatus]}
              {cans.assessorCredential ? ` · ${cans.assessorCredential}` : assessor?.credentials ? ` · On file: ${assessor.credentials}` : ""}
              {cans.credentialCheck ? ` · Checked by ${actorName(cans.credentialCheck.by)}, ${stamp(cans.credentialCheck.at)}` : ""}
            </p>
          </div>
          <Button size="sm" icon={BadgeCheck} onClick={() => setCred(true)} disabled={!cans.assessor || locked}>Record a credential check</Button>
        </div>
        <Facts
          items={[
            ["Started", cans.startedBy ? `${actorName(cans.startedBy)}${cans.startedAt !== undefined ? ` · ${stamp(cans.startedAt)}` : ""}` : "Not recorded"],
            ["Reassessment or update due", cans.reassessDue === null ? REASSESS_PENDING : longDate(cans.reassessDue)],
          ]}
        />
      </CardBody>
      {cred ? <CredentialModal record={record} cans={cans} onClose={() => setCred(false)} /> : null}
    </Card>
  );
}

function CredentialModal({ record, cans, onClose }: { record: IntakeRecord; cans: CansAssessment; onClose: () => void }) {
  const save = useStore((s) => s.recordCredentialCheck);
  const assessor = cans.assessor ? staffOf(cans.assessor) : undefined;
  const [credential, setCredential] = useState(cans.assessorCredential ?? assessor?.credentials ?? "");
  const [status, setStatus] = useState<"verified" | "unverified">("verified");
  const [note, setNote] = useState("");
  return (
    <Modal
      open
      onClose={onClose}
      title="Record a credential check"
      subtitle={assessor ? `Assessor: ${assessor.name}` : undefined}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!credential.trim()} onClick={() => { save(record.id, credential.trim(), status, note.trim() || undefined); onClose(); }}>Save check</Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-[13px] text-ink2">{ASSESSOR_PER_POLICY}. This records only that you checked the license or credential named below.</p>
        <Field label="Credential checked"><TextInput value={credential} onChange={(e) => setCredential(e.target.value)} /></Field>
        <Field label="Result">
          <Select label="Result" value={status} onChange={(v) => setStatus(v as "verified" | "unverified")} options={[{ value: "verified", label: "License confirmed" }, { value: "unverified", label: "Could not confirm" }]} />
        </Field>
        <Field label="Note (optional)"><TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="How it was checked" /></Field>
      </div>
    </Modal>
  );
}
