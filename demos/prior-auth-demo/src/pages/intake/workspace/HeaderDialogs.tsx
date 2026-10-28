import { useState } from "react";
import { Banner, Button, Field, Modal, TextArea, TextInput } from "@/components/ui";
import { INTAKE_STAFF } from "@/data/intake/seed";
import type { IntakeRecord } from "@/data/intake/types";
import { cn } from "@/lib/cn";
import { CLOSE_REASONS, closeIntake, reassignIntake } from "./actions";

export function ReassignDialog({ record, onClose }: { record: IntakeRecord; onClose: () => void }) {
  const [to, setTo] = useState(record.assignedTo);
  const [reason, setReason] = useState("");
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Reassign this intake"
      subtitle={`${record.id} · ${record.initials || "No patient yet"}${record.age !== null ? `, ${record.age}` : ""}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={to === record.assignedTo} onClick={() => { reassignIntake(record.id, to, reason); onClose(); }}>Reassign</Button>
        </>
      }
    >
      <div role="radiogroup" aria-label="Assign to" className="flex flex-col gap-1.5">
        {INTAKE_STAFF.map((s) => (
          <button key={s.id} type="button" role="radio" aria-checked={to === s.id} onClick={() => setTo(s.id)} className={cn("flex items-center gap-3 rounded-xl border px-3 py-2 text-left", to === s.id ? "border-forest bg-sage-bg" : "border-edge bg-white hover:bg-tile")}>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-forest text-[11px] font-semibold text-white" aria-hidden="true">{s.initials}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium">{s.name}{s.id === record.assignedTo ? " (now)" : ""}</span>
              <span className="block text-[12px] text-muted">{s.role}{s.credentials ? `, ${s.credentials}` : ""}</span>
            </span>
          </button>
        ))}
      </div>
      <Field label="Reason (optional)" className="mt-3">
        <TextInput value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why it moves" />
      </Field>
    </Modal>
  );
}

export function CloseDialog({ record, onClose, initialReason }: { record: IntakeRecord; onClose: () => void; initialReason?: (typeof CLOSE_REASONS)[number] }) {
  const [reason, setReason] = useState<string>(initialReason ?? CLOSE_REASONS[0]);
  const [note, setNote] = useState("");
  const alertOpen = record.safety?.status === "open";
  const needsNote = reason === "Other";
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Close this intake"
      subtitle={`${record.id} · the record is kept and can be reopened`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="danger" disabled={alertOpen || (needsNote && !note.trim())} onClick={() => { closeIntake(record.id, reason, note); onClose(); }}>Close intake</Button>
        </>
      }
    >
      {alertOpen ? <Banner tone="risk" title="A safety alert is open" className="mb-3">A clinician reviews it before this intake is closed.</Banner> : null}
      <div role="radiogroup" aria-label="Reason for closing" className="flex flex-col gap-1.5">
        {CLOSE_REASONS.map((r) => (
          <button key={r} type="button" role="radio" aria-checked={reason === r} onClick={() => setReason(r)} className={cn("flex items-center gap-3 rounded-xl border px-3 py-2 text-left text-[14px]", reason === r ? "border-forest bg-sage-bg" : "border-edge bg-white hover:bg-tile")}>
            <span className={cn("grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px]", reason === r ? "border-forest" : "border-[#D9D6CF]")}>{reason === r ? <span className="h-2 w-2 rounded-full bg-forest" /> : null}</span>
            {r}
          </button>
        ))}
      </div>
      <Field label={needsNote ? "Say why" : "Note (optional)"} required={needsNote} className="mt-3">
        <TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </Modal>
  );
}
