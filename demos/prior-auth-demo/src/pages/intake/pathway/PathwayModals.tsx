import { useState } from "react";
import { Banner, Button, Field, Modal, TextArea, TextInput } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import { REDESIGN_START } from "@/data/va/policy";
import { GROUP_LABEL, SERVICE_GROUPS, serviceById, servicesIn, type VaServiceId } from "@/data/va/services";
import { useStore } from "@/store";
import { useIntakeNow } from "../lib/policyNow";
import { dateNotes } from "./pathwayModel";

const lines = (t: string) => t.split("\n").map((x) => x.trim()).filter(Boolean);

/** A person adds a pathway option by hand. Date notes from the policy layer are added for them, so nothing is offered outside its dates silently. */
export function AddPathwayModal({ record, onClose }: { record: IntakeRecord; onClose: () => void }) {
  const add = useStore((s) => s.addPathway);
  const now = useIntakeNow();
  const [service, setService] = useState<VaServiceId | "external">("opt");
  const [label, setLabel] = useState("");
  const [rationale, setRationale] = useState("");
  const [outstanding, setOutstanding] = useState("Clinical review");
  const [reqs, setReqs] = useState("");
  const notes = service === "external" ? [] : dateNotes(service, record, now, []);
  const ok = rationale.trim() && (service !== "external" || label.trim());
  const save = () => {
    const s = service === "external" ? null : serviceById(service);
    add(record.id, {
      serviceId: service, externalLabel: service === "external" ? label.trim() : undefined, fit: "not_assessed", rationale: rationale.trim(),
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
