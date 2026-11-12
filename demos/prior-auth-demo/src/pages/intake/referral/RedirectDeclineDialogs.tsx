import { useState } from "react";
import { Banner, Button, Dropdown, Field, Modal, TextArea, TextInput } from "@/components/ui";
import { DECLINE_REASON, DECLINE_REASON_ORDER, REDIRECT_REASON, REDIRECT_REASON_ORDER, type DeclineReasonCode, type RedirectReasonCode } from "@/data/intake/decision";
import { destinationsFor, EXTERNAL_DESTINATIONS } from "@/data/intake/destinations";
import type { IntakeRecord } from "@/data/intake/types";
import { serviceById } from "@/data/va/services";
import { useStore } from "@/store";

const OTHER = "other";

/** Redirect: a reason and where the person goes. The reason and destination go into a draft notice to the referrer; the internal note does not. */
export function RedirectDialog({ record, onClose, onDone }: { record: IntakeRecord; onClose: () => void; onDone: (id: string) => void }) {
  const redirect = useStore((s) => s.redirectIntakeReferral);
  const [reason, setReason] = useState<RedirectReasonCode | "">("");
  const [dest, setDest] = useState<string>("");
  const [other, setOther] = useState("");
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const matching = destinationsFor(record.serviceId);
  const options = [...(matching.length ? matching : EXTERNAL_DESTINATIONS), { id: OTHER, org: "Another organization or program" } as { id: string; org: string }];
  const org = dest === OTHER ? other.trim() : (EXTERNAL_DESTINATIONS.find((d) => d.id === dest)?.org ?? "");
  const go = () => {
    setTried(true);
    if (!reason || !org) return;
    const id = redirect(record.id, { reasonCode: reason, destination: { org, id: dest === OTHER ? undefined : dest }, note });
    if (id) onDone(id);
  };
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Redirect the referral"
      subtitle={`${record.initials || "This person"}${record.age !== null ? `, ${record.age}` : ""} · asked for ${serviceById(record.serviceId).short}`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={go} data-confirm-redirect>Redirect</Button></>}
    >
      <div className="flex flex-col gap-4">
        <Field label="Reason" required error={tried && !reason ? "Choose a reason." : undefined}>
          <Dropdown<RedirectReasonCode | ""> variant="field" ariaLabel="Reason for redirecting" value={reason} placeholder="Choose a reason" onChange={(v) => v && setReason(v)} options={REDIRECT_REASON_ORDER.map((c) => ({ value: c, label: REDIRECT_REASON[c] }))} menuWidth={380} />
        </Field>
        <Field label="Where the person goes" required error={tried && !org ? "Choose a destination." : undefined} hint="Organizations in the directory are fictional.">
          <Dropdown<string> variant="field" ariaLabel="Destination" value={dest} placeholder="Choose a destination" onChange={setDest} options={options.map((d) => ({ value: d.id, label: d.org }))} menuWidth={420} />
        </Field>
        {dest === OTHER ? (
          <Field label="Organization or program" required>
            <TextInput value={other} onChange={(e) => setOther(e.target.value)} placeholder="Name (fictional)" />
          </Field>
        ) : null}
        <Field label="Internal note (not sent)">
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </Field>
        <Banner tone="neutral">A draft notice to the referrer is made with the reason and destination. It is not sent until you approve it.</Banner>
      </div>
    </Modal>
  );
}

/** Decline: a reason from the list is required (and the person's words when it is "other"). A draft notice goes to the referrer, unsent. */
export function DeclineDialog({ record, onClose, onDone }: { record: IntakeRecord; onClose: () => void; onDone: (id: string) => void }) {
  const decline = useStore((s) => s.declineIntakeReferral);
  const [reason, setReason] = useState<DeclineReasonCode | "">("");
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const needsNote = reason === "other";
  const go = () => {
    setTried(true);
    if (!reason || (needsNote && !note.trim())) return;
    const id = decline(record.id, { reasonCode: reason, note });
    if (id) onDone(id);
  };
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Decline the referral"
      subtitle={`${record.initials || "This person"}${record.age !== null ? `, ${record.age}` : ""} · asked for ${serviceById(record.serviceId).short}`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="danger" onClick={go} data-confirm-decline>Decline</Button></>}
    >
      <div className="flex flex-col gap-4">
        <Field label="Reason" required error={tried && !reason ? "Choose a reason." : undefined}>
          <Dropdown<DeclineReasonCode | ""> variant="field" ariaLabel="Reason for declining" value={reason} placeholder="Choose a reason" onChange={(v) => v && setReason(v)} options={DECLINE_REASON_ORDER.map((c) => ({ value: c, label: DECLINE_REASON[c] }))} menuWidth={420} />
        </Field>
        <Field label={needsNote ? "Reason in your words" : "Internal note (not sent)"} required={needsNote} error={tried && needsNote && !note.trim() ? "Enter the reason." : undefined}>
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
        </Field>
        <Banner tone="neutral">A draft notice to the referrer is made with the reason. It is not sent until you approve it.</Banner>
      </div>
    </Modal>
  );
}
