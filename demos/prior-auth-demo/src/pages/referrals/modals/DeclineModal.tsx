import { useState } from "react";
import { Banner, Button, Dropdown, Field, Modal, Switch, TextArea } from "@/components/ui";
import { CHANNEL_LABEL, DECLINE_LABEL, DECLINE_REASONS, hasFail, isOpen, type DeclineReason, type Referral } from "@/data/referrals";
import { plural } from "@/lib/format";
import { useStore } from "@/store";

/** A sensible first choice: what the checks and coverage already say. */
function defaultReason(targets: Referral[]): DeclineReason {
  const r = targets.length === 1 ? targets[0] : undefined;
  if (!r) return "criteria";
  if (r.checks.some((c) => c.key === "age" && c.state === "fail" && !c.resolved)) return "age";
  if (r.coverage && (r.coverage.kind === "lapsed" || r.coverage.kind === "unconfirmed")) return "coverage";
  return hasFail(r.checks) ? "criteria" : "higher_care";
}

/** Gate: a person declines. One referral from its page, or many from the table. Mounted only while open. */
export function DeclineModal({ ids, onClose, onDone }: { ids: string[]; onClose: () => void; onDone?: (declined: number) => void }) {
  const referrals = useStore((s) => s.referrals);
  const decline = useStore((s) => s.declineReferrals);
  const targets = referrals.filter((r) => ids.includes(r.id) && isOpen(r.status));
  const skipped = ids.length - targets.length;
  const [reason, setReason] = useState<DeclineReason>(() => defaultReason(targets));
  const [note, setNote] = useState("");
  const [courtesy, setCourtesy] = useState(true);
  const one = targets.length === 1 ? targets[0] : undefined;
  const confirm = () => {
    const n = decline(ids, { reason, note: note.trim(), courtesy });
    onClose();
    onDone?.(n);
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={one ? `Decline ${one.id}?` : `Decline ${plural(targets.length, "referral")}?`}
      subtitle="The reason goes on the activity timeline. You can reopen a declined referral later."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={confirm} disabled={!targets.length}>
            {targets.length > 1 ? `Decline ${targets.length} referrals` : "Decline referral"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {skipped > 0 ? <Banner tone="mid">{plural(skipped, "selected referral")} {skipped === 1 ? "is" : "are"} already decided and will be skipped.</Banner> : null}
        <Field label="Reason" required>
          <Dropdown variant="field" ariaLabel="Decline reason" value={reason} options={DECLINE_REASONS.map((d) => ({ value: d, label: DECLINE_LABEL[d] }))} onChange={setReason} />
        </Field>
        <Field label="Note" hint="Optional. Only your team sees this.">
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should the next person know?" />
        </Field>
        <Switch checked={courtesy} onChange={setCourtesy} label={one ? `Send a courtesy reply to the referrer (by ${CHANNEL_LABEL[one.channel === "phone" || one.channel === "portal" ? "email" : one.channel].toLowerCase()})` : "Send a courtesy reply to each referrer"} />
      </div>
    </Modal>
  );
}
