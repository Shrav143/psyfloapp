import { useState } from "react";
import { Send } from "lucide-react";
import { Banner, Button, Checkbox, Field, Modal, TextArea } from "@/components/ui";
import { CHANNEL_LABEL } from "@/data/intake/destinations";
import type { IntakeRecord, ReferralOut } from "@/data/intake/types";
import { DAY } from "@/lib/time";
import { useStore } from "@/store";
import { meOf } from "@/store/intake";
import { sendProblems } from "./referralModel";

/** The person's approval to send. The agent prepared the packet; the person reads it, can edit the message, and approves. Delivery is simulated. */
export function SendReferralModal({ record, ro, onClose }: { record: IntakeRecord; ro: ReferralOut; onClose: () => void }) {
  const setStatus = useStore((s) => s.setReferralStatus);
  const clock = useStore((s) => s.clock);
  const me = useStore((s) => meOf(s));
  const toast = useStore((s) => s.toast);
  const [msg, setMsg] = useState(ro.packet?.message ?? "");
  const [ok, setOk] = useState(false);
  const problems = sendProblems(ro);
  const channel = CHANNEL_LABEL[ro.destination.channel];
  const external = ro.destination.channel !== "internal";
  const send = () => {
    setStatus(record.id, ro.id, "sent", {
      action: `Approved and sent by ${channel.toLowerCase()} (simulated)`, detail: `To ${ro.destination.org}. ${ro.docs.filter((d) => d.attached).length} documents. Delivery simulated: nothing left the demo.`,
      patch: { approvedBy: me, packet: ro.packet ? { ...ro.packet, message: msg.trim() || ro.packet.message } : ro.packet, followUpAt: ro.followUpAt ?? clock + 2 * DAY },
    });
    toast({ title: `${ro.id} sent (simulated)`, body: `To ${ro.destination.org} by ${channel.toLowerCase()}. Nothing actually left the demo.`, tone: "good" });
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={`Approve and send ${ro.id}`}
      subtitle={`${ro.destination.org} · ${channel}`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={Send} disabled={!!problems.length || !ok} onClick={send}>Approve and send (simulated)</Button></>}
    >
      <div className="space-y-3">
        {problems.length ? <Banner tone="risk" title="Cannot send yet">{problems.join(". ")}.</Banner> : null}
        <p className="text-[13px] text-ink2">
          {external ? "Sending patient information outside the clinic needs a person's approval, the consent on file and an approved channel." : "An internal handoff to this clinic's own team."} In this demo delivery is simulated: nothing is transmitted.
        </p>
        <ul className="list-disc space-y-0.5 pl-5 text-[13px] text-ink">
          {ro.docs.map((d) => <li key={d.name}>{d.name}: {d.attached ? "attached" : d.required ? "missing" : "not attached (optional)"}</li>)}
        </ul>
        <Field label="Cover message (drafted by the Referral Coordination Agent)">
          <TextArea rows={5} value={msg} onChange={(e) => setMsg(e.target.value)} />
        </Field>
        <Checkbox checked={ok} onChange={setOk} label={`I approve sending these documents to ${ro.destination.org} by ${channel.toLowerCase()}.`} />
      </div>
    </Modal>
  );
}
