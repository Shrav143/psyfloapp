import { useState } from "react";
import { Banner, Button, Dropdown, Field, Modal, TextInput } from "@/components/ui";
import { STAFF, type Referral, type StaffId } from "@/data/referrals";
import { PROGRAM_LABEL, PROGRAMS, type Program } from "@/data/types";
import { DAY } from "@/lib/time";
import { useStore } from "@/store";
import { acceptWarnings } from "@/store/referralsLogic";
import { fromInput, toInputDate } from "../dates";

/** Gate: a person accepts. Lists what is still open, takes an owner, a program and a target date. Mounted only while open.
    `onAccepted` runs after the referral is accepted, for a caller that moves on right away. */
export function AcceptModal({ r, onClose, onAccepted }: { r: Referral; onClose: () => void; onAccepted?: () => void }) {
  const clock = useStore((s) => s.clock);
  const capacity = useStore((s) => s.capacity);
  const accept = useStore((s) => s.acceptReferral);
  const [owner, setOwner] = useState<StaffId>(r.owner ?? "jp");
  const [program, setProgram] = useState<Program>(r.program);
  const [date, setDate] = useState(toInputDate(clock + DAY));
  const warnings = acceptWarnings(r);
  const cap = capacity[program];
  const admitBy = fromInput(date);
  const confirm = () => {
    if (admitBy === null) return;
    accept(r.id, { owner, program, admitBy });
    onClose();
    onAccepted?.();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Accept this referral?"
      subtitle={`${r.id} · ${r.patient.initials}, ${r.patient.age} · ${r.source.name}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={confirm} disabled={admitBy === null}>Accept referral</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {warnings.length ? (
          <Banner tone="mid" title={`${warnings.length} ${warnings.length === 1 ? "thing is" : "things are"} still open`}>
            <ul className="mt-1 list-disc pl-4">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <div className="mt-1">You can accept anyway. Each open item stays on the timeline.</div>
          </Banner>
        ) : (
          <Banner tone="good">All 9 checks are clear and coverage is confirmed.</Banner>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Owner">
            <Dropdown variant="field" ariaLabel="Owner" value={owner} options={STAFF.map((s) => ({ value: s.id, label: s.name }))} onChange={setOwner} />
          </Field>
          <Field label="Program">
            <Dropdown variant="field" ariaLabel="Program" value={program} options={PROGRAMS.map((p) => ({ value: p, label: PROGRAM_LABEL[p], hint: `${capacity[p].open} open` }))} onChange={setProgram} />
          </Field>
        </div>
        <Field label="Target admission date" hint={cap.open > 0 ? `${PROGRAM_LABEL[program]}: ${cap.open} ${cap.unit}${cap.open === 1 ? "" : "s"} open this week, ${cap.open - 1} after this.` : `${PROGRAM_LABEL[program]} has nothing open this week. Accepting puts the referral on the waiting list.`}>
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
