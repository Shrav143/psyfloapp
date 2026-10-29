import { useState } from "react";
import { Link } from "react-router-dom";
import { Banner, Button, Field, Modal, TextArea } from "@/components/ui";
import type { DuplicateHit } from "@/data/intake/referralFacts";
import { TRIAGE_LABEL } from "@/data/intake/types";
import { paths } from "@/routes";
import { useStore } from "@/store";

/** A person who looks like one already in the queue. Open the existing record, or create this one anyway and say why. */
export function DuplicatePanel({ draftId, hits, chosen }: { draftId: string; hits: DuplicateHit[]; chosen?: { ofId: string; reason: string } }) {
  const setDup = useStore((s) => s.setIntakeDraftDuplicate);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  if (!hits.length) return null;
  const top = hits[0];
  if (chosen) {
    return (
      <div data-dup-chosen>
        <Banner tone="neutral" title={`Creating anyway: it looks like ${chosen.ofId}`} action={<Button size="sm" onClick={() => setDup(draftId, null)}>Change</Button>}>
          Reason: {chosen.reason}
        </Banner>
      </div>
    );
  }
  const confirm = () => {
    setTried(true);
    if (!reason.trim()) return;
    setDup(draftId, { ofId: top.record.id, reason: reason.trim() });
    setOpen(false);
  };
  return (
    <>
      <div data-dup-banner>
      <Banner tone="mid" title={hits.length === 1 ? "Possible duplicate" : `${hits.length} possible duplicates`}>
        <ul className="mt-1 flex flex-col gap-1.5">
          {hits.map((h) => (
            <li key={h.record.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
              <span>
                <span className="font-semibold">{h.record.id} · {h.record.initials}{h.record.age !== null ? `, ${h.record.age}` : ""}</span>{" "}
                has {h.why}. {TRIAGE_LABEL[h.record.triage]}.
              </span>
              <Link to={paths.intakeRecord(h.record.id, "referral")} className="font-semibold underline underline-offset-2">Open existing record</Link>
            </li>
          ))}
        </ul>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setOpen(true)} data-create-anyway>Create anyway with a reason</Button>
        </div>
      </Banner>
      </div>
      {open ? (
        <Modal
          open
          onClose={() => setOpen(false)}
          size="sm"
          title="Create anyway"
          subtitle={`It looks like ${top.record.id}. The reason is saved with the record.`}
          footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={confirm}>Create anyway</Button></>}
        >
          <Field label="Why this is a different referral" required error={tried && !reason.trim() ? "Enter a reason." : undefined}>
            <TextArea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="For example: a different person with the same initials and age." autoFocus />
          </Field>
        </Modal>
      ) : null}
    </>
  );
}
