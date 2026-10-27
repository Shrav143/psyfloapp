import { useState } from "react";
import { BadgeCheck, FileCog, Lock } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Field, Modal, Pill, TextInput } from "@/components/ui";
import { INTAKE_STAFF, staffOf } from "@/data/intake/seed";
import type { CansAssessment, IntakeRecord } from "@/data/intake/types";
import { CANS_PENDING, type CansApplies } from "@/data/va/policy";
import { longDate, stamp } from "@/lib/time";
import { useStore } from "@/store";
import { actorName } from "../shared/provenance";
import { ASSESSOR_PENDING, CANS_STATUS_LABEL, fromIso, isoOf, NO_ITEMS, REASSESS_PENDING, SIGN_BLOCKED } from "./cansModel";
import { TemplateDrawer } from "./TemplateDrawer";
import { Facts, Select } from "./ui";

const CRED_LABEL: Record<CansAssessment["credentialStatus"], string> = { not_checked: "Not checked", verified: "License confirmed by staff", unverified: "Could not confirm" };

/** The CANS Lifetime record: template status, assessor and credential check, dates, and the signature, which stays off without a template. */
export function CansRecordCard({ record, cans, applies }: { record: IntakeRecord; cans: CansAssessment; applies: CansApplies }) {
  const setDetails = useStore((s) => s.setCansDetails);
  const [tpl, setTpl] = useState(false);
  const [cred, setCred] = useState(false);
  const assessor = cans.assessor ? staffOf(cans.assessor) : undefined;
  return (
    <Card data-cans-record>
      <CardHeader title="Assessment record" subtitle={applies === "upcoming" ? "Preparation only until July 1, 2027" : "Required for this service (draft policy)"} right={<Pill tone="neutral">{CANS_STATUS_LABEL[cans.status]}</Pill>} />
      <CardBody className="space-y-4">
        <div className="rounded-xl border border-mid-edge bg-mid-bg/60 px-3.5 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-mid-ink">Template not configured</p>
              <p className="mt-0.5 text-[13px] text-ink">{CANS_PENDING}</p>
              <p className="mt-1 text-[13px] text-ink2">{NO_ITEMS}</p>
            </div>
            <Button size="sm" icon={FileCog} onClick={() => setTpl(true)}>Template</Button>
          </div>
        </div>
        <Facts
          items={[
            ["Assessment version", cans.templateVersion],
            ["Required domains", "Not configured"],
            ["Item responses", "None: no items are configured"],
            ["Missing items", "Cannot be listed until the official mapping loads"],
            ["Validation", "Not run: no template"],
            ["Reassessment or update due", cans.reassessDue === null ? REASSESS_PENDING : longDate(cans.reassessDue)],
            ["Started", cans.startedBy ? `${actorName(cans.startedBy)} · ${cans.startedAt !== undefined ? stamp(cans.startedAt) : ""}` : "Not recorded"],
            ["Review and signature", cans.signedBy ? `Signed by ${actorName(cans.signedBy)}` : "Not signed"],
          ]}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Assessor">
            <Select
              label="Assessor"
              value={cans.assessor ?? ""}
              onChange={(v) => setDetails(record.id, { assessor: v || undefined })}
              options={[{ value: "", label: "Not assigned" }, ...INTAKE_STAFF.map((s) => ({ value: s.id, label: `${s.name}, ${s.role}` }))]}
            />
          </Field>
          <Field label="Planned assessment date">
            <TextInput type="date" value={cans.date !== undefined ? isoOf(cans.date) : ""} onChange={(e) => setDetails(record.id, { date: fromIso(e.target.value) ?? undefined })} aria-label="Planned assessment date" />
          </Field>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line px-3.5 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-ink">Assessor credentials</p>
            <p className="text-[13px] text-ink2">{ASSESSOR_PENDING}. A person may record that they checked the assessor's license; that is not a DMAS qualification decision.</p>
            <p className="mt-1 text-[12px] text-muted">
              {CRED_LABEL[cans.credentialStatus]}
              {cans.assessorCredential ? ` · ${cans.assessorCredential}` : assessor?.credentials ? ` · On file: ${assessor.credentials}` : ""}
              {cans.credentialCheck ? ` · Checked by ${actorName(cans.credentialCheck.by)}, ${stamp(cans.credentialCheck.at)}` : ""}
            </p>
          </div>
          <Button size="sm" icon={BadgeCheck} onClick={() => setCred(true)} disabled={!cans.assessor}>Record a credential check</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" icon={Lock} disabled aria-describedby="cans-sign-reason">Sign CANS Lifetime</Button>
          <p id="cans-sign-reason" className="min-w-0 flex-1 text-[13px] text-muted">{SIGN_BLOCKED}</p>
        </div>
      </CardBody>
      <TemplateDrawer record={record} open={tpl} onClose={() => setTpl(false)} />
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
        <p className="text-[13px] text-ink2">{ASSESSOR_PENDING}. This records only that you checked the license or credential named below.</p>
        <Field label="Credential checked"><TextInput value={credential} onChange={(e) => setCredential(e.target.value)} /></Field>
        <Field label="Result">
          <Select label="Result" value={status} onChange={(v) => setStatus(v as "verified" | "unverified")} options={[{ value: "verified", label: "License confirmed" }, { value: "unverified", label: "Could not confirm" }]} />
        </Field>
        <Field label="Note (optional)"><TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="How it was checked" /></Field>
      </div>
    </Modal>
  );
}
