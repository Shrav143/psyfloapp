import { useMemo, useState } from "react";
import { Banner, Button, Checkbox, Dropdown, Field, Modal, TextArea, TextInput } from "@/components/ui";
import { NOTICE_CHANNELS, type NoticeChannel } from "@/data/intake/decision";
import { draftNotice, noticeRecipient } from "@/data/intake/notices";
import type { IntakeRecord } from "@/data/intake/types";
import { useStore } from "@/store";
import { meOf } from "@/store/intake";
import { signatureOf } from "@/store/intakeReferral";
import { referralGaps } from "./missing";
import { useSendBasis } from "./SendBasis";

/** Request missing information. The request is a draft the person reads and edits. Saving it keeps it as a draft; approving it sends it (simulated).
    Either way the referral is set to Needs information and a follow-up is added. */
export function RequestInfoDialog({ record, onClose, onDone }: { record: IntakeRecord; onClose: () => void; onDone: (id: string) => void }) {
  const request = useStore((s) => s.requestMissingInfo);
  const me = useStore((s) => meOf(s));
  const gaps = useMemo(() => referralGaps(record), [record]);
  const [picked, setPicked] = useState<string[]>(gaps.map((g) => g.key));
  const [extra, setExtra] = useState("");
  const [to, setTo] = useState(noticeRecipient(record));
  const [channel, setChannel] = useState<NoticeChannel>(record.method === "fax" ? "Fax" : "Secure message");
  const [edited, setEdited] = useState<string | null>(null);
  const send = useSendBasis(record);
  const items = [...gaps.filter((g) => picked.includes(g.key)).map((g) => g.ask), ...(extra.trim() ? [extra.trim()] : [])];
  const draft = useMemo(() => draftNotice(record, "missing_info", { signedBy: signatureOf(me), items }), [record, me, items.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
  const body = edited ?? draft.body;
  const ready = items.length > 0 && !!to.trim() && !!body.trim();
  const go = (approve: boolean) => {
    if (!ready) return;
    const id = request(record.id, { items, to: to.trim(), channel, subject: draft.subject, body, send: approve && send.basis ? { basis: send.basis } : undefined });
    if (id) onDone(id);
  };
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Request missing information"
      subtitle="Psyflo drafts the request. It is not sent until you approve it."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={() => go(false)} disabled={!ready} data-save-request>Save as draft</Button>
          <Button variant="primary" onClick={() => go(true)} disabled={!ready || !send.basis} data-send-request>Approve and send (simulated)</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-1.5 text-[13px] font-medium text-ink2">What to ask for</div>
          <div className="flex flex-col gap-2">
            {gaps.map((g) => (
              <Checkbox key={g.key} checked={picked.includes(g.key)} onChange={(v) => setPicked((p) => (v ? [...p, g.key] : p.filter((k) => k !== g.key)))} label={g.ask} />
            ))}
            {!gaps.length ? <p className="text-[13px] text-muted">Nothing required is missing. Add what you need below.</p> : null}
          </div>
          <TextInput className="mt-2" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Something else to ask for" aria-label="Something else to ask for" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
          <Field label="To"><TextInput value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <Field label="Send by">
            <Dropdown<NoticeChannel> variant="field" ariaLabel="Send by" value={channel} onChange={setChannel} options={NOTICE_CHANNELS.map((c) => ({ value: c, label: c }))} />
          </Field>
        </div>
        <Field label="Message (draft)">
          <TextArea value={body} onChange={(e) => setEdited(e.target.value)} rows={9} />
        </Field>
        <Banner tone="neutral" title="Draft, simulated">AI-generated draft for a person to review. Sending is simulated: nothing leaves the demo.</Banner>
        {send.node}
      </div>
    </Modal>
  );
}
