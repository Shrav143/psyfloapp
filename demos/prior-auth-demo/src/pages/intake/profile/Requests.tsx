import { useState } from "react";
import { MessageSquareReply, Send, X } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Checkbox, Modal, Pill, Segmented } from "@/components/ui";
import { specOf } from "@/data/intake/fields";
import type { IntakeRecord } from "@/data/intake/types";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import type { PatientRequest, RequestedField } from "@/store/intakeProfile";
import { runAgent } from "../lib/agents";
import { actorName, SimulatedTag } from "../shared/provenance";
import { askStatus, defaultAsk, replyAnswers, requestable } from "./model";

const GROUP_ORDER = ["Demographics", "Contact", "Guardian and consent", "Insurance"];
const groupOf = (section: string, group: string) => (section === "coverage" ? "Insurance" : group);

/** Choose what to ask, who to ask and how. Sending is simulated: a task waits for the reply, and the audit trail records it. */
export function RequestDialog({ record, onClose, preset }: { record: IntakeRecord; onClose: () => void; preset?: string[] }) {
  const send = useStore((s) => s.requestPatientInfo);
  const minor = record.age !== null && record.age < 18;
  const canGuardian = minor || !!record.profile.guardianName?.value;
  const specs = requestable(record);
  const [to, setTo] = useState<"guardian" | "patient">(minor ? "guardian" : "patient");
  const [channel, setChannel] = useState<"text" | "email">("text");
  const [picked, setPicked] = useState<string[]>(() => [...new Set([...(preset ?? []), ...(preset ? [] : defaultAsk(record))])]);
  const toggle = (k: string) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const number = to === "guardian" ? (record.profile.guardianPhone?.value || record.suggestions.find((x) => x.status === "pending" && x.field === "guardianPhone")?.value) : record.profile.phone?.value;
  const submit = () => {
    const fields: RequestedField[] = specs.filter((s) => picked.includes(s.key)).map((s) => ({ section: s.section === "coverage" ? "coverage" : "profile", key: s.key }));
    send(record.id, { to, channel, fields });
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Request from the patient or guardian"
      subtitle="A secure form, simulated in the demo. The answers come back as suggestions for staff to review."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={Send} disabled={!picked.length} onClick={submit}>
            Send {picked.length} item{picked.length === 1 ? "" : "s"} (simulated)
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div>
            <div className="mb-1.5 text-[13px] font-medium text-ink2">Send to</div>
            {canGuardian ? (
              <Segmented items={[{ id: "guardian", label: "Guardian" }, { id: "patient", label: "Patient" }]} value={to} onChange={setTo} />
            ) : (
              <p className="text-[14px]">The patient</p>
            )}
          </div>
          <div>
            <div className="mb-1.5 text-[13px] font-medium text-ink2">How</div>
            <Segmented items={[{ id: "text", label: "Secure text link" }, { id: "email", label: "Secure email link" }]} value={channel} onChange={setChannel} />
          </div>
        </div>
        {channel === "text" ? <p className="text-[13px] text-muted">{number ? `Sends to ${number}.` : `No ${to === "guardian" ? "guardian" : "patient"} phone on file yet. Staff confirm the number before it goes out.`}</p> : null}
        {GROUP_ORDER.map((g) => {
          const rows = specs.filter((s) => groupOf(s.section, s.group) === g);
          if (!rows.length) return null;
          return (
            <fieldset key={g}>
              <legend className="mb-1 text-[11px] font-medium tracking-[0.1em] text-muted uppercase">{g}</legend>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {rows.map((s) => (
                  <li key={s.key} className="flex items-center justify-between gap-3 px-3 py-2">
                    <Checkbox checked={picked.includes(s.key)} onChange={() => toggle(s.key)} label={<span className="text-[13px]">{s.label}</span>} />
                    <span className="shrink-0 text-[12px] text-muted">{askStatus(record, s)}</span>
                  </li>
                ))}
              </ul>
            </fieldset>
          );
        })}
        <p className="text-[12px] text-muted">Clinical and psychosocial history is not sent by form. Staff ask about it in person, as appropriate.</p>
      </div>
    </Modal>
  );
}

function RequestRow({ record, q }: { record: IntakeRecord; q: PatientRequest }) {
  const clock = useStore((s) => s.clock);
  const reply = useStore((s) => s.simulatePatientReply);
  const cancel = useStore((s) => s.cancelPatientRequest);
  const reading = record.tasks.some((t) => t.action === "Read the secure form reply" && (t.status === "queued" || t.status === "running"));
  const labels = q.fields.map((f) => specOf(f.key)?.label ?? f.key);
  const waiting = record.suggestions.filter((x) => x.status === "pending" && q.suggestionIds?.includes(x.id)).length;
  const simulate = () => {
    const { answers, blank } = replyAnswers(record, q.fields, clock);
    runAgent(record.id, {
      role: "referral", action: "Read the secure form reply", section: "profile", source: `Secure form reply from the ${q.to} (simulated)`, ms: 900,
      work: () => {
        const added = reply(q.id, answers);
        return `${added} answer${added === 1 ? "" : "s"} added as suggestions${blank ? `; ${blank} left blank` : ""}. Nothing is written until staff accept.`;
      },
    });
  };
  return (
    <li data-request={q.id} className="border-b border-line py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[14px] font-semibold">Secure form to the {q.to} by {q.channel === "text" ? "text" : "email"}</span>
        <Pill tone={q.status === "waiting" ? "mid" : q.status === "replied" ? "good" : "neutral"}>{q.status === "waiting" ? "Waiting for reply" : q.status === "replied" ? "Replied" : "Cancelled"}</Pill>
        <SimulatedTag />
      </div>
      <p className="mt-1 text-[13px] text-ink2">{labels.join(", ")}</p>
      <p className="mt-0.5 text-[12px] text-muted">
        Sent by {actorName(q.sentBy)} · {stamp(q.sentAt)}
        {q.repliedAt !== undefined ? ` · Replied ${stamp(q.repliedAt)}${waiting ? ` · ${waiting} answer${waiting === 1 ? "" : "s"} to review under the fields below` : " · All answers reviewed"}` : ""}
      </p>
      {q.status === "waiting" ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="primary" icon={MessageSquareReply} loading={reading} onClick={simulate}>Simulate the reply</Button>
          <span className="text-[12px] text-muted">Demo control</span>
          <Button size="sm" icon={X} onClick={() => cancel(q.id)}>Cancel request</Button>
        </div>
      ) : null}
    </li>
  );
}

/** Requests sent from this record, with the demo control that makes the patient or guardian answer. */
export function RequestsCard({ record }: { record: IntakeRecord }) {
  const requests = useStore((s) => s.profileRequests).filter((q) => q.recordId === record.id);
  if (!requests.length) return null;
  const open = requests.filter((q) => q.status === "waiting").length;
  return (
    <Card>
      <CardHeader title="Requests to the patient or guardian" right={open ? <Pill tone="mid">{open} waiting</Pill> : undefined} />
      <CardBody className="py-1">
        <ul>
          {[...requests].reverse().map((q) => <RequestRow key={q.id} record={record} q={q} />)}
        </ul>
      </CardBody>
    </Card>
  );
}
