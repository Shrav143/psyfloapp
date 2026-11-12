import { useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { Banner, Button, Card, CardBody, CardHeader, Dropdown, Field, Modal, Pill, TextArea, TextInput } from "@/components/ui";
import { NOTICE_CHANNELS, NOTICE_LABEL, type NoticeChannel, type ReferralNotice } from "@/data/intake/decision";
import type { IntakeRecord } from "@/data/intake/types";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import { actorName } from "../shared/provenance";
import { useSendBasis } from "./SendBasis";

function SendDialog({ record, notice, onClose }: { record: IntakeRecord; notice: ReferralNotice; onClose: () => void }) {
  const send = useStore((s) => s.sendIntakeNotice);
  const basis = useSendBasis(record);
  const go = () => {
    if (basis.basis && send(record.id, notice.id, basis.basis)) onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Approve and send (simulated)"
      subtitle={`To ${notice.to} by ${notice.channel.toLowerCase()}. Nothing leaves the demo.`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={Send} onClick={go} disabled={!basis.basis} data-approve-send>Approve and send</Button></>}
    >
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-line bg-tile px-3.5 py-3 text-[13px] whitespace-pre-line">{notice.body}</div>
        {basis.node}
      </div>
    </Modal>
  );
}

function NoticeRow({ record, notice }: { record: IntakeRecord; notice: ReferralNotice }) {
  const edit = useStore((s) => s.editIntakeNotice);
  const discard = useStore((s) => s.discardIntakeNotice);
  const [editing, setEditing] = useState(false);
  const [sending, setSending] = useState(false);
  const [to, setTo] = useState(notice.to);
  const [channel, setChannel] = useState<NoticeChannel>(notice.channel);
  const [body, setBody] = useState(notice.body);
  const draft = notice.status === "draft";
  return (
    <li data-notice={notice.kind} data-notice-status={notice.status} className="rounded-xl border border-line px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-semibold">{NOTICE_LABEL[notice.kind]}</span>
            <Pill tone={draft ? "mid" : "good"}>{draft ? "Draft, not sent" : "Sent (simulated)"}</Pill>
          </div>
          <p className="mt-0.5 text-[12px] text-muted">To {notice.to} by {notice.channel.toLowerCase()} · {draft ? `drafted ${stamp(notice.createdAt)}` : `sent ${stamp(notice.sentAt ?? notice.createdAt)}${notice.approvedBy ? ` · approved by ${actorName(notice.approvedBy)}` : ""}`}</p>
        </div>
        {draft && !editing ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setEditing(true)}>Edit</Button>
            <Button size="sm" icon={Trash2} onClick={() => discard(record.id, notice.id)} aria-label={`Discard the ${NOTICE_LABEL[notice.kind].toLowerCase()} draft`}>Discard</Button>
            <Button size="sm" variant="primary" icon={Send} onClick={() => setSending(true)} data-notice-send>Approve and send</Button>
          </div>
        ) : null}
      </div>
      {editing ? (
        <div className="mt-3 flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
            <Field label="To"><TextInput value={to} onChange={(e) => setTo(e.target.value)} /></Field>
            <Field label="Send by"><Dropdown<NoticeChannel> variant="field" ariaLabel="Send by" value={channel} onChange={setChannel} options={NOTICE_CHANNELS.map((c) => ({ value: c, label: c }))} /></Field>
          </div>
          <Field label="Message"><TextArea value={body} onChange={(e) => setBody(e.target.value)} rows={8} /></Field>
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={() => { edit(record.id, notice.id, { to: to.trim() || notice.to, channel, body }); setEditing(false); }}>Save draft</Button>
            <Button size="sm" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="mt-2 max-h-[160px] overflow-y-auto rounded-lg bg-tile px-3 py-2 text-[13px] whitespace-pre-line">{notice.body}</div>
      )}
      {!draft && notice.basis ? <p className="mt-2 text-[12px] text-muted">{notice.basis === "release_on_file" ? "A release of information was on file." : "Sent under the organization's protocol. Organization protocol, not legal advice."}</p> : null}
      {sending ? <SendDialog record={record} notice={notice} onClose={() => setSending(false)} /> : null}
    </li>
  );
}

/** The messages to the referrer: drafts waiting for a person, and the ones a person approved (simulated). A draft is never sent by itself. */
export function Notices({ record }: { record: IntakeRecord }) {
  const all = (record.referralNotices ?? []).filter((n) => n.status !== "discarded").slice().reverse();
  if (!all.length) return null;
  const drafts = all.filter((n) => n.status === "draft").length;
  return (
    <Card data-card="Notices to the referrer">
      <CardHeader title="Notices to the referrer" subtitle={drafts ? `${drafts} draft${drafts === 1 ? "" : "s"} waiting for your approval` : "Everything has been sent (simulated)"} />
      <CardBody className="flex flex-col gap-3">
        {drafts ? <Banner tone="neutral">Drafts are not sent until you approve them. A release of information, or the organization's protocol, is the basis for sending.</Banner> : null}
        <ul className="flex flex-col gap-3">
          {all.map((n) => <NoticeRow key={n.id} record={record} notice={n} />)}
        </ul>
      </CardBody>
    </Card>
  );
}
