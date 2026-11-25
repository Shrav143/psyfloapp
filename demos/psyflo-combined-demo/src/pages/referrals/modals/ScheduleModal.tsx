import { useState } from "react";
import { Button, Field, Modal, TextInput } from "@/components/ui";
import type { Referral } from "@/data/referrals";
import { DAY, toDate } from "@/lib/time";
import { useStore } from "@/store";
import { fromInput, toInputDate } from "../dates";

const pad = (n: number): string => String(n).padStart(2, "0");

/** Pick the intake visit with plain date and time inputs. */
export function ScheduleModal({ r, onClose }: { r: Referral; onClose: () => void }) {
  const clock = useStore((s) => s.clock);
  const schedule = useStore((s) => s.scheduleIntake);
  const start = r.intakeAt && r.intakeAt > clock ? r.intakeAt : clock + 2 * DAY;
  const [date, setDate] = useState(toInputDate(start));
  const [time, setTime] = useState(r.intakeAt ? `${pad(toDate(start).getHours())}:${pad(toDate(start).getMinutes())}` : "09:00");
  const at = fromInput(date, time);
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={r.status === "scheduled" ? "Change the intake visit" : "Schedule intake"}
      subtitle={`${r.id} · ${r.patient.initials}, ${r.patient.age}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={at === null} onClick={() => { if (at !== null) schedule(r.id, at); onClose(); }}>Schedule intake</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Time"><TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
