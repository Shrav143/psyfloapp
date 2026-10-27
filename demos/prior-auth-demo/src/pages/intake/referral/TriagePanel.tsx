import { useState } from "react";
import { Link } from "react-router-dom";
import { Banner, Button, Card, CardBody, CardHeader, Dropdown, Field, Modal, Pill, Segmented, Switch, TextArea, TextInput } from "@/components/ui";
import { INTAKE_STAFF } from "@/data/intake/seed";
import { TRIAGE_LABEL, type IntakeRecord, type TriageStatus } from "@/data/intake/types";
import type { Urgency } from "@/data/types";
import { availableOn, LEGACY_LAST_DAY, REDESIGN_START, vaDate } from "@/data/va/policy";
import { serviceById } from "@/data/va/services";
import { longDate, toDate } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { ServiceSelect } from "../queue/IntakeInputs";
import { TRIAGE_TONE_Q, URGENCY_LABEL } from "../queue/labels";

const NEEDS_REASON: TriageStatus[] = ["declined", "redirected"];
const ASK_NOTE: TriageStatus[] = [...NEEDS_REASON, "closed"];
const iso = (m: number) => {
  const d = toDate(m);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Triage: status (a reason is required to decline or redirect), urgency, priority, the coordinator, the requested service and its planned start. */
export function TriagePanel({ record }: { record: IntakeRecord }) {
  // Actions are read when used, so the panel re-renders only with its record.
  const s = useStore.getState();
  const [asking, setAsking] = useState<TriageStatus | null>(null);
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const svc = serviceById(record.serviceId);
  const ok = availableOn(record.serviceId, record.serviceDate);

  const choose = (t: TriageStatus) => {
    if (t === record.triage) return;
    if (ASK_NOTE.includes(t)) {
      setAsking(t);
      setNote("");
      setTried(false);
      return;
    }
    s.setTriage(record.id, t);
    s.toast({ title: `Triage: ${TRIAGE_LABEL[t]}`, tone: "neutral" });
  };
  const confirm = () => {
    setTried(true);
    if (!asking || (NEEDS_REASON.includes(asking) && !note.trim())) return;
    s.setTriage(record.id, asking, note.trim() || undefined);
    s.toast({ title: `Triage: ${TRIAGE_LABEL[asking]}`, body: note.trim() || undefined, tone: "neutral" });
    setAsking(null);
  };

  return (
    <Card id="triage">
      <CardHeader title="Triage" right={<Pill tone={TRIAGE_TONE_Q[record.triage]}>{TRIAGE_LABEL[record.triage]}</Pill>} />
      <CardBody className="@container">
        <div className="grid grid-cols-1 gap-4 @min-[480px]:grid-cols-2">
          <Field label="Status">
            <Dropdown<TriageStatus> variant="field" ariaLabel="Triage status" value={record.triage} onChange={choose} options={(Object.keys(TRIAGE_LABEL) as TriageStatus[]).map((t) => ({ value: t, label: TRIAGE_LABEL[t] }))} />
          </Field>
          <Field label="Assigned to">
            <Dropdown<string> variant="field" ariaLabel="Assigned to" value={record.assignedTo} onChange={(v) => { s.assignIntake(record.id, v); s.toast({ title: `Assigned to ${INTAKE_STAFF.find((x) => x.id === v)?.name}`, tone: "neutral" }); }} options={INTAKE_STAFF.map((x) => ({ value: x.id, label: x.name, hint: x.role }))} menuWidth={300} />
          </Field>
          <Field label="Urgency" hint={record.urgency === "emergent" ? "If anyone may be in danger now, flag a safety concern and use the escalation steps." : undefined}>
            <Segmented<Urgency> items={(["routine", "urgent", "emergent"] as Urgency[]).map((u) => ({ id: u, label: URGENCY_LABEL[u] }))} value={record.urgency} onChange={(u) => s.setIntakeUrgency(record.id, u)} />
          </Field>
          <Field label="Priority">
            <div className="flex h-[38px] items-center">
              <Switch checked={record.priority} onChange={(v) => s.setIntakePriority(record.id, v)} label="High priority" />
            </div>
          </Field>
          <Field label="Requested service">
            <ServiceSelect value={record.serviceId} onChange={(v) => s.setIntakeService(record.id, v)} />
          </Field>
          <Field label="Planned start">
            <TextInput type="date" aria-label="Planned start" value={iso(record.serviceDate)} onChange={(e) => e.target.value && s.setIntakeServiceDate(record.id, vaDate(e.target.value))} />
          </Field>
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
          <Pill tone={ok ? "good" : "risk"}>{ok ? "Available" : "Not available"}</Pill>
          <span>{svc.short} on {longDate(record.serviceDate)}</span>
        </p>
        {svc.status === "redesign" && record.serviceDate < REDESIGN_START ? (
          <Banner tone="mid" className="mt-3" title={`${svc.short} starts July 1, 2027`} action={<Button size="sm" onClick={() => s.setIntakeServiceDate(record.id, REDESIGN_START)}>Move start to 7/1/2027</Button>}>
            It cannot be delivered or authorized before then, and a published draft is not in effect. Move the planned start, or choose a service in effect now.
          </Banner>
        ) : null}
        {svc.status === "retiring" && record.serviceDate > LEGACY_LAST_DAY ? (
          <Banner tone="mid" className="mt-3" title={`${svc.short} ends June 30, 2027`} action={<Link to={paths.intakeRecord(record.id, "pathway")} className="text-[13px] font-semibold underline">Review service options</Link>}>
            It cannot be delivered after that date. There is no one-to-one replacement: a clinician reviews what fits next.
          </Banner>
        ) : null}
        {record.triageNote ? <p className="mt-3 text-[13px] text-ink2"><span className="text-muted">Triage note:</span> {record.triageNote}</p> : null}
      </CardBody>
      {asking ? (
        <Modal
          open
          onClose={() => setAsking(null)}
          size="sm"
          title={`Triage: ${TRIAGE_LABEL[asking]}`}
          subtitle={NEEDS_REASON.includes(asking) ? "A reason is required. It is saved to the audit trail." : "Add a note if it helps the next person."}
          footer={
            <>
              <Button onClick={() => setAsking(null)}>Cancel</Button>
              <Button variant="primary" onClick={confirm}>Set to {TRIAGE_LABEL[asking].toLowerCase()}</Button>
            </>
          }
        >
          <Field label={asking === "redirected" ? "Redirected to, and why" : asking === "declined" ? "Reason for declining" : "Note"} required={NEEDS_REASON.includes(asking)} error={tried && NEEDS_REASON.includes(asking) && !note.trim() ? "Enter a reason." : undefined}>
            <TextArea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </Field>
        </Modal>
      ) : null}
    </Card>
  );
}
