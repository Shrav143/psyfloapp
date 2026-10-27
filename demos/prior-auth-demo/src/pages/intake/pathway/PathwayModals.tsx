import { useState } from "react";
import { Banner, Button, Field, Modal, TextArea, TextInput } from "@/components/ui";
import type { IntakeRecord, PathwayFit } from "@/data/intake/types";
import { availableOn, LEGACY_LAST_DAY, lonFor, REDESIGN_START } from "@/data/va/policy";
import { GROUP_LABEL, SERVICE_GROUPS, serviceById, servicesIn, type VaServiceId } from "@/data/va/services";
import { DAY, longDate } from "@/lib/time";
import { useStore } from "@/store";
import { APPLIES_LABEL, cansApplies, fromIso, isoOf } from "../cans/cansModel";
import { Select } from "../cans/ui";
import { useIntakeNow } from "../lib/policyNow";
import { dateNotes, FIT_LABEL } from "./pathwayModel";

const lines = (t: string) => t.split("\n").map((x) => x.trim()).filter(Boolean);

/** A person adds a pathway option by hand. Date notes from the policy layer are added for them, so nothing is offered outside its dates silently. */
export function AddPathwayModal({ record, onClose }: { record: IntakeRecord; onClose: () => void }) {
  const add = useStore((s) => s.addPathway);
  const now = useIntakeNow();
  const [service, setService] = useState<VaServiceId | "external">("opt");
  const [label, setLabel] = useState("");
  const [fit, setFit] = useState<PathwayFit>("not_assessed");
  const [rationale, setRationale] = useState("");
  const [outstanding, setOutstanding] = useState("Clinical review");
  const [reqs, setReqs] = useState("");
  const notes = service === "external" ? [] : dateNotes(service, record, now, []);
  const ok = rationale.trim() && (service !== "external" || label.trim());
  const save = () => {
    const s = service === "external" ? null : serviceById(service);
    add(record.id, {
      serviceId: service, externalLabel: service === "external" ? label.trim() : undefined, fit, rationale: rationale.trim(),
      outstanding: service === "external" ? lines(outstanding) : dateNotes(service, record, now, lines(outstanding)), referralReqs: lines(reqs),
      availability: !s ? "external" : s.status === "redesign" && now < REDESIGN_START ? "not_yet" : "unknown",
    });
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="Add a care pathway option" subtitle="For clinical review. Adding an option is not a recommendation." footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!ok} onClick={save}>Add option</Button></>}>
      <div className="space-y-3">
        <Field label="Service">
          <select aria-label="Service" value={service} onChange={(e) => setService(e.target.value as VaServiceId | "external")} className="h-[38px] w-full rounded-xl border border-field bg-white px-3 text-[14px]">
            {SERVICE_GROUPS.map((g) => (
              <optgroup key={g} label={GROUP_LABEL[g]}>
                {servicesIn(g).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </optgroup>
            ))}
            <optgroup label="Other">
              <option value="external">External program (outside the Medicaid service list)</option>
            </optgroup>
          </select>
        </Field>
        {service === "external" ? <Field label="Program name" required><TextInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Program, organization (fictional)" /></Field> : null}
        {notes.length ? <Banner tone="mid" title="Dates from the policy layer">{notes.join(". ")}.</Banner> : null}
        <Field label="Fit">
          <Select label="Fit" value={fit} onChange={(v) => setFit(v as PathwayFit)} options={(Object.keys(FIT_LABEL) as PathwayFit[]).map((f) => ({ value: f, label: FIT_LABEL[f] }))} />
        </Field>
        <Field label="Rationale" required><TextArea rows={2} value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="What in the record makes this worth reviewing" /></Field>
        <Field label="Outstanding items" hint="One per line"><TextArea rows={2} value={outstanding} onChange={(e) => setOutstanding(e.target.value)} /></Field>
        <Field label="Referral requirements" hint="One per line, optional"><TextArea rows={2} value={reqs} onChange={(e) => setReqs(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

export function NotSelectedModal({ name, onClose, onSave }: { name: string; onClose: () => void; onSave: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <Modal open size="sm" onClose={onClose} title="Mark not selected" subtitle={name} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!reason.trim()} onClick={() => { onSave(reason.trim()); onClose(); }}>Mark not selected</Button></>}>
      <Field label="Reason" required><TextArea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why this option is not being pursued" /></Field>
    </Modal>
  );
}

/** A staff action, separate from clinical selection: the option becomes the record's requested service with a planned start that its dates allow. */
export function MakeRequestedModal({ record, serviceId, pwId, onClose }: { record: IntakeRecord; serviceId: VaServiceId; pwId: string; onClose: () => void }) {
  const apply = useStore((s) => s.setRequestedService);
  const toast = useStore((s) => s.toast);
  const clock = useStore((s) => s.clock);
  const now = useIntakeNow();
  const s = serviceById(serviceId);
  const soon = clock + 7 * DAY;
  const initial = s.status === "redesign" ? Math.max(record.serviceDate, REDESIGN_START) : s.status === "retiring" ? (record.serviceDate <= LEGACY_LAST_DAY ? record.serviceDate : Math.min(soon, LEGACY_LAST_DAY)) : record.serviceDate >= clock ? record.serviceDate : soon;
  const [date, setDate] = useState(isoOf(initial));
  const at = fromIso(date);
  const error = at === null ? "Pick a date." : !availableOn(serviceId, at) ? (s.status === "redesign" ? `${s.short} starts July 1, 2027. Pick that date or later.` : `${s.short} ends June 30, 2027. Pick that date or earlier.`) : null;
  const preview = at === null ? null : cansApplies({ ...record, serviceId, serviceDate: at }, now).applies;
  const lon = lonFor(serviceId).applies;
  return (
    <Modal
      open
      onClose={onClose}
      title="Make this the requested service"
      subtitle={`From ${serviceById(record.serviceId).short} to ${s.short}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!!error} onClick={() => { if (at === null) return; apply(record.id, serviceId, at, pwId); toast({ title: `Requested service: ${s.short}`, body: `Planned start ${longDate(at)}. Recorded in the audit trail.`, tone: "good" }); onClose(); }}>Change requested service</Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-[13px] text-ink2">This changes what the intake asks for. It is a staff action, not a clinical selection. CANS, Level of Need and authorization requirements follow the new service.</p>
        <Field label="Planned start" error={error ?? undefined}>
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        {preview ? (
          <ul className="space-y-0.5 text-[13px] text-ink">
            <li>CANS Lifetime for {s.short}: <b>{APPLIES_LABEL[preview]}</b></li>
            <li>Level of Need: <b>{lon === "yes" ? "Pending validated configuration" : lon === "unresolved" ? "Applicability not confirmed" : "Does not apply"}</b></li>
          </ul>
        ) : null}
      </div>
    </Modal>
  );
}
