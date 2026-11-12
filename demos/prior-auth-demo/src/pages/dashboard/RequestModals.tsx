import { useState } from "react";
import { FileText, ShieldCheck } from "lucide-react";
import { AgentChip, Banner, Button, Modal } from "@/components/ui";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL, type PsyRequest } from "@/data/types";
import { shortDate } from "@/lib/time";
import { buildInfoAnswer } from "./infoAnswer";
import { approvalFacts } from "./requestFacts";
import { Portal } from "./Portal";

/** Answer gate: Packet drafted the reply, a person reads it and decides to send. */
export function InfoAnswerModal({ request, open, onClose, onSend }: { request: PsyRequest; open: boolean; onClose: () => void; onSend: () => void }) {
  const answer = buildInfoAnswer(request);
  const payer = payerById(request.payerId);
  return (
    <Portal>
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={`Packet's answer for ${request.id}`}
      subtitle={`${payer.name} asked for more information · ${PROGRAM_LABEL[request.program]}`}
      footer={
        <>
          <Button onClick={onClose}>Not yet</Button>
          <Button variant="primary" icon={ShieldCheck} onClick={onSend}>
            Sign and send answer
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2 text-sm text-muted">
          Drafted by <AgentChip agent="packet" /> and checked by <AgentChip agent="integrity" />
        </div>
        <section>
          <h3 className="mb-2 font-serif text-lg font-semibold">What the payer asked for</h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-ink2">
            {answer.asked.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ol>
        </section>
        <section>
          <h3 className="mb-2 font-serif text-lg font-semibold">The drafted answer</h3>
          <div className="space-y-3 rounded-2xl border border-tile-edge bg-tile px-5 py-4 text-sm leading-relaxed">
            {answer.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </section>
        <section>
          <h3 className="mb-2 font-serif text-lg font-semibold">Attached from the chart</h3>
          <ul className="flex flex-col gap-1.5">
            {answer.attachments.map((a) => (
              <li key={a} className="flex items-center gap-2 text-sm">
                <FileText size={16} className="ico text-muted" />
                {a}
              </li>
            ))}
          </ul>
        </section>
        <Banner tone="good" title="Integrity checked every sentence against the chart">
          4 of 4 checks passed. Navigator sends the answer through the payer's portal as soon as you sign. Nothing leaves before then.
        </Banner>
      </div>
    </Modal>
    </Portal>
  );
}

/** Confirm gate: the write-back puts the approval number and dates in the EMR, and nothing else. */
export function WritebackModal({ request, open, onClose, onConfirm }: { request: PsyRequest; open: boolean; onClose: () => void; onConfirm: () => void }) {
  const [busy, setBusy] = useState(false);
  const facts = approvalFacts(request);
  const confirm = () => {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      onConfirm();
    }, 1100);
  };
  return (
    <Portal>
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      size="sm"
      title="Approve the write-back"
      subtitle={`${request.id} · ${payerById(request.payerId).name}`}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" loading={busy} onClick={confirm}>
            Write to the EMR
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-ink2">EMR Connect will write only these three things to the chart. No notes, diagnoses or identifiers are written.</p>
      <dl className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-2 rounded-2xl border border-tile-edge bg-tile px-4 py-3.5 text-sm">
        <dt className="text-muted">Approval number</dt>
        <dd className="font-semibold">{facts.number}</dd>
        <dt className="text-muted">Approved</dt>
        <dd className="font-semibold">{facts.amount}</dd>
        <dt className="text-muted">Dates</dt>
        <dd className="font-semibold">
          {shortDate(facts.from)} to {shortDate(facts.to)}
        </dd>
      </dl>
    </Modal>
    </Portal>
  );
}
