import { useState } from "react";
import { Banner, Button, Dropdown, Field, Modal, TextArea } from "@/components/ui";
import { REPLY_VIA_LABEL, type CheckKey, type Referral, type ReplyVia } from "@/data/referrals";
import { useStore } from "@/store";
import { composeRequest } from "@/store/referralsLogic";

const VIA: ReplyVia[] = ["fax", "eReferral", "email", "phone"];

/** Gate: a person asks the referrer for more. The message is composed from the open findings and stays editable. */
export function RequestInfoModal({ r, keys, onClose }: { r: Referral; keys: CheckKey[]; onClose: () => void }) {
  const send = useStore((s) => s.requestReferralInfo);
  const initialVia: ReplyVia = r.channel === "phone" || r.channel === "portal" ? "email" : r.channel;
  const checks = r.checks.filter((c) => keys.includes(c.key));
  const [via, setVia] = useState<ReplyVia>(initialVia);
  const [message, setMessage] = useState(() => composeRequest(r, checks, initialVia));
  const [touched, setTouched] = useState(false);
  const pickVia = (v: ReplyVia) => {
    setVia(v);
    if (!touched) setMessage(composeRequest(r, checks, v));
  };
  const confirm = () => {
    send(r.id, { via, message: message.trim() });
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Request more information"
      subtitle={`To ${r.source.name}${r.source.fax ? `, fax ${r.source.fax}` : ""}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={confirm} disabled={!message.trim()}>Send request</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Banner tone="neutral">The message comes from {checks.length ? `the ${checks.length} open ${checks.length === 1 ? "finding" : "findings"}` : "this referral"}. The referral moves to Awaiting info until they reply.</Banner>
        <Field label="Send by">
          <Dropdown variant="field" ariaLabel="Send by" value={via} options={VIA.map((v) => ({ value: v, label: REPLY_VIA_LABEL[v] }))} onChange={pickVia} />
        </Field>
        <Field label="Message">
          <TextArea aria-label="Message" rows={11} className="min-h-[220px] leading-relaxed" value={message} onChange={(e) => { setTouched(true); setMessage(e.target.value); }} />
        </Field>
      </div>
    </Modal>
  );
}
