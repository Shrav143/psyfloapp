import { useState } from "react";
import { Banner, Button, Field, Modal, TextArea } from "@/components/ui";
import { programIdOf } from "@/data/intake/referralFacts";
import type { IntakeRecord } from "@/data/intake/types";
import { serviceById } from "@/data/va/services";
import { useStore } from "@/store";
import { capacityOf, waitlistCount } from "@/store/intakeReferral";
import { unconfirmed } from "./missing";

/** Accept for assessment. Shows the demo capacity of the program: with an open place it takes one; with none, the person goes on the waitlist. A draft notice
    to the referrer is made, and nothing is sent until a person approves it. */
export function AcceptDialog({ record, onClose, onDone }: { record: IntakeRecord; onClose: () => void; onDone: (id: string, outcome: "accepted" | "waitlisted") => void }) {
  const accept = useStore((s) => s.acceptIntakeReferral);
  const intakes = useStore((s) => s.intakes);
  const [note, setNote] = useState("");
  const programId = programIdOf(record.serviceId);
  const cap = capacityOf({ intakes }, programId);
  const full = !!cap && cap.open <= 0;
  const open = unconfirmed(record).length;
  const svc = serviceById(record.serviceId);
  const go = () => {
    const res = accept(record.id, { waitlist: full, note });
    if (res) onDone(res.id, res.outcome);
  };
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={full ? "Add to the waitlist and accept" : "Accept for assessment"}
      subtitle={`${record.initials || "This person"}${record.age !== null ? `, ${record.age}` : ""} · ${svc.short}`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={go} data-confirm-accept>{full ? "Add to waitlist and accept" : "Accept for assessment"}</Button></>}
    >
      <div className="flex flex-col gap-3 text-[14px]">
        {cap ? (
          full ? (
            <Banner tone="mid" title={`No open ${cap.unit} for ${svc.short}`}>
              {cap.open} of {cap.total} {cap.unit}s are open. {waitlistCount({ intakes }, cap.id) ? `${waitlistCount({ intakes }, cap.id)} on the waitlist.` : ""} The person goes on the waitlist and the assessment can start. Demo configuration.
            </Banner>
          ) : (
            <p>{svc.short} has {cap.open} of {cap.total} {cap.unit}s open. Accepting takes one. <span className="text-muted">Demo configuration.</span></p>
          )
        ) : (
          <p className="text-muted">{svc.short} has no capacity limit in the demo.</p>
        )}
        <p>
          Next: choose the purpose, program, population and setting for the intake.{open ? ` ${open} value${open === 1 ? " is" : "s are"} not confirmed yet and stay tagged until a person confirms them.` : ""}
        </p>
        <p className="text-muted">A draft notice to the referrer is made. It is not sent until you approve it.</p>
        <Field label="Note for the record (optional)">
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </Field>
      </div>
    </Modal>
  );
}
