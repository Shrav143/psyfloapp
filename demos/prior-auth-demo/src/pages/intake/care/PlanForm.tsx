import { useState } from "react";
import { Check, FileSignature, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Banner, Button, Card, CardBody, CardHeader, Disclosure, Dropdown, Field, Modal, Pill, TextArea, TextInput } from "@/components/ui";
import { planGaps, serviceName } from "@/data/assess/carePlan";
import { INTAKE_STAFF } from "@/data/intake/seed";
import { REFERRAL_OUT_LABEL, type IntakeRecord } from "@/data/intake/types";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import type { CarePlanText } from "@/store/intakeCarePlan";
import { actorName } from "../shared/provenance";
import { SignOffDialog } from "../shared/SignOff";

const NONE = "none";
const act = () => useStore.getState();

function TextField({ record, field, label, hint, rows = 2, placeholder, disabled }: { record: IntakeRecord; field: CarePlanText; label: string; hint?: string; rows?: number; placeholder?: string; disabled: boolean }) {
  const value = (record.carePlan?.[field] as string | undefined) ?? "";
  return (
    <Field label={label} hint={hint}>
      <TextArea aria-label={label} rows={rows} value={value} disabled={disabled} placeholder={placeholder} onChange={(e) => act().setCarePlanText(record.id, field, e.target.value)} />
    </Field>
  );
}

/** The care plan form: goals, interventions, the frequency and duration the clinician asks for (typed by them; Psyflo suggests no amount), who is responsible, coordination with referrals out,
    the transition or discharge plan and caregiver involvement. A qualified clinician approves it; an approved plan is read-only and a change makes the next version. */
export function PlanForm({ record }: { record: IntakeRecord }) {
  const [goal, setGoal] = useState("");
  const [approving, setApproving] = useState(false);
  const [revising, setRevising] = useState(false);
  const [why, setWhy] = useState("");
  const cp = record.carePlan;
  const approved = cp?.status === "approved";
  const gaps = planGaps(record);
  const minor = record.age !== null && record.age < 18;
  const add = () => {
    act().addCareGoal(record.id, goal);
    setGoal("");
  };

  return (
    <Card data-card="care-plan">
      <CardHeader
        title="Care plan"
        subtitle="The clinician's plan for the service selected above."
        right={approved ? <Pill tone="good" dot>Approved, version {cp?.version ?? 1}</Pill> : <Pill tone="mid">{cp ? `Draft, version ${cp.version ?? 1}` : "Not started"}</Pill>}
      />
      <CardBody className="space-y-4">
        {approved ? (
          <Banner tone="good" title={`Approved by ${actorName(cp?.approvedBy ?? "")}${cp?.rolePlay ? " (demo role-play)" : ""}${cp?.approvedAt !== undefined ? ` · ${stamp(cp.approvedAt)}` : ""}`} action={<Button size="sm" icon={RotateCcw} onClick={() => setRevising(true)}>Revise</Button>}>
            Version {cp?.version ?? 1} is read-only. A revision opens the next version and keeps this one.
          </Banner>
        ) : null}

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[13px] font-medium text-ink2">Treatment goals</span>
            {cp && !approved ? <span className="inline-flex items-center gap-1 text-[12px] text-muted"><Check size={12} className="ico" aria-hidden="true" />Saved as you type</span> : null}
          </div>
          <ul className="space-y-2">
            {(cp?.goals ?? []).map((g) => (
              <li key={g.id} className="flex items-center gap-2">
                <TextInput aria-label="Treatment goal" value={g.text} disabled={approved} onChange={(e) => act().setCareGoal(record.id, g.id, e.target.value)} />
                {!approved ? <Button size="sm" variant="ghost" icon={Trash2} aria-label="Remove this goal" onClick={() => act().removeCareGoal(record.id, g.id)} /> : null}
              </li>
            ))}
          </ul>
          {!approved ? (
            <div className="mt-2 flex items-center gap-2">
              <TextInput aria-label="Add a treatment goal" value={goal} placeholder="A goal in the person's own terms" onChange={(e) => setGoal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && goal.trim()) add(); }} />
              <Button size="sm" icon={Plus} disabled={!goal.trim()} onClick={add}>Add goal</Button>
            </div>
          ) : null}
        </div>

        <TextField record={record} field="interventions" label="Planned interventions" rows={3} disabled={approved} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Frequency requested" hint="Typed by the clinician. Psyflo suggests no amount.">
            <TextInput aria-label="Frequency requested" value={cp?.frequency ?? ""} disabled={approved} placeholder="For example: three days a week" onChange={(e) => act().setCarePlanText(record.id, "frequency", e.target.value)} />
          </Field>
          <Field label="Duration requested" hint="Typed by the clinician.">
            <TextInput aria-label="Duration requested" value={cp?.duration ?? ""} disabled={approved} placeholder="For example: eight weeks" onChange={(e) => act().setCarePlanText(record.id, "duration", e.target.value)} />
          </Field>
        </div>
        <Field label="Responsible staff">
          <Dropdown<string> variant="field" ariaLabel="Responsible staff" disabled={approved} value={cp?.responsibleStaff ?? NONE} onChange={(v) => act().setCareStaff(record.id, v === NONE ? "" : v)} options={[{ value: NONE, label: "Not assigned" }, ...INTAKE_STAFF.map((x) => ({ value: x.id, label: `${x.name}, ${x.role}` }))]} />
        </Field>

        <div className="space-y-2">
          <span className="text-[13px] font-medium text-ink2">Coordination: referrals out</span>
          {record.referralsOut.length ? (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {record.referralsOut.map((ro) => (
                <li key={ro.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-[13px]">
                  <span className="min-w-0 flex-1 font-medium">{ro.destination.org}</span>
                  <Pill tone="neutral">{REFERRAL_OUT_LABEL[ro.status]}</Pill>
                  <Pill tone={ro.consent === "on_file" ? "good" : "mid"}>{ro.consent === "on_file" ? "Consent on file" : ro.consent === "declined" ? "Consent declined" : "Consent needed"}</Pill>
                </li>
              ))}
            </ul>
          ) : <p className="text-[13px] text-muted">No referral out yet. Create one from an option above; sending needs a person's approval and a consent on file.</p>}
        </div>
        <TextField record={record} field="coordination" label="Coordination notes" disabled={approved} placeholder="Who else is involved and what each person does" />
        <TextField record={record} field="transition" label="Transition or discharge plan" disabled={approved} />
        <TextField record={record} field="caregiver" label={minor ? "Caregiver involvement (required for a young person)" : "Caregiver or support person involvement"} disabled={approved} />

        {!approved ? (
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
            <Button variant="primary" icon={FileSignature} disabled={gaps.length > 0} onClick={() => setApproving(true)}>Approve the care plan</Button>
            {gaps.length ? <span data-testid="approve-gaps" className="min-w-0 flex-1 text-[13px] text-mid-ink">Still needed: {gaps.join("; ").toLowerCase()}.</span> : <span className="text-[13px] text-muted">A qualified clinician approves it. Approval is not a payer decision.</span>}
          </div>
        ) : null}

        {cp?.versions?.length ? (
          <Disclosure variant="plain" title={<span className="font-sans text-[13px] font-semibold">Earlier versions ({cp.versions.length})</span>}>
            <ul className="space-y-1.5 px-1 py-2 text-[13px]">
              {cp.versions.map((v) => (
                <li key={v.version}>
                  <b className="font-semibold">Version {v.version}</b> · approved by {actorName(v.approvedBy ?? "")}{v.approvedAt !== undefined ? ` · ${stamp(v.approvedAt)}` : ""}{v.rolePlay ? " (demo role-play)" : ""} · {serviceName(v.selectedServiceId)} · {v.goals.length} goals, {v.frequency || "no frequency"}. Reopened: {v.reason}
                </li>
              ))}
            </ul>
          </Disclosure>
        ) : null}
      </CardBody>

      <SignOffDialog
        open={approving} onClose={() => setApproving(false)} record={record} title="Approve the care plan"
        attestation="I reviewed this care plan and approve it for the selected service. Approval is not a payer decision and not a statement that the service is covered."
        signLabel="Approve care plan" onSign={(signer, rolePlay) => { act().approveCarePlan(record.id, signer.id, rolePlay); }}
      />
      <Modal
        open={revising} onClose={() => setRevising(false)} title="Revise the care plan" subtitle={`Opens version ${(cp?.version ?? 1) + 1}. Version ${cp?.version ?? 1} is kept as approved.`}
        footer={<><Button onClick={() => setRevising(false)}>Cancel</Button><Button variant="primary" disabled={!why.trim()} onClick={() => { if (act().reviseCarePlan(record.id, why)) { setRevising(false); setWhy(""); } }}>Open the next version</Button></>}
      >
        <Field label="Why it is reopened" required>
          <TextArea aria-label="Why the care plan is reopened" rows={3} value={why} onChange={(e) => setWhy(e.target.value)} />
        </Field>
      </Modal>
    </Card>
  );
}
