import { useState } from "react";
import { Check, Megaphone, WandSparkles } from "lucide-react";
import { AgentChip, Banner, Button, Card, CardHeader, Modal } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import { conditionText, STEP_KIND_LABEL, type PayerConfig, type PendingChange, type Proposal } from "@/data/payerConfig";
import { viewerById } from "@/data/viewers";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import { joinWords } from "./lib/checker";
import { useOpenDrafts, useOtherSiteNote } from "./lib/drafts";
import { UpdateDraftsModal } from "./UpdateDraftsModal";

function AcknowledgeModal({ id, pending, onClose }: { id: string; pending: PendingChange; onClose: () => void }) {
  const viewerName = viewerById(useStore((s) => s.viewerId)).name;
  return (
    <Modal open size="sm" onClose={onClose} title="Acknowledge this change?" subtitle="It records who saw the change and when." footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={Check} onClick={() => { useStore.getState().acknowledgeChange(id); onClose(); }}>Acknowledge change</Button></>}>
      <div className="flex flex-col gap-3 text-sm">
        <div className="rounded-2xl bg-tile px-4 py-3"><b>{pending.title}</b><div className="mt-0.5 text-ink2">{pending.text} Effective {pending.effective}.</div></div>
        <p className="text-ink2">You are acknowledging as {viewerName}. This does not change any draft. Updating the drafts is a separate step.</p>
      </div>
    </Modal>
  );
}

/** The ochre banner: Acknowledge change records a person, Update drafts redrafts. Update stays off until the change is acknowledged.
    The drafts it names are the payer's own unsent drafts, read live. */
function PendingBanner({ id, name, pending }: { id: string; name: string; pending: PendingChange }) {
  const [dialog, setDialog] = useState<"ack" | "update" | null>(null);
  const drafts = useOpenDrafts(id);
  const elsewhere = useOtherSiteNote(id);
  const n = drafts.length;
  const ack = pending.acknowledged;
  return (
    <>
      <Banner tone="mid" icon={Megaphone} title={pending.title}>
        <p>
          {pending.text}{" "}
          {n ? `${AGENTS[pending.agents[0]].name} can redraft the ${n} ${n === 1 ? "draft" : "drafts"} that ${n === 1 ? "is" : "are"} not yet sent: ${joinWords(drafts.map((d) => d.id))}. Requests already sent keep what they were sent with.` : `No open drafts are affected. New drafts for ${name} use the change once you apply it.`}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          {ack ? (
            <span className="inline-flex h-[38px] items-center gap-2 rounded-xl bg-good-bg px-4 font-medium text-good-ink"><Check size={16} className="ico" />Acknowledged by {ack.by}, {stamp(ack.at)}</span>
          ) : (
            <Button variant="primary" icon={Check} onClick={() => setDialog("ack")}>Acknowledge change</Button>
          )}
          <Button icon={WandSparkles} disabled={!ack} title={ack ? undefined : "Acknowledge the change first"} onClick={() => setDialog("update")}>{n ? `Update ${n} ${n === 1 ? "draft" : "drafts"}` : "Apply to new drafts"}</Button>
          <span className="max-w-[420px] text-xs">{n ? "Acknowledging records who saw it. Updating redrafts, and each draft returns to Case Manager for a new signature." : "Acknowledging records who saw it. Applying makes new drafts use the change."}{elsewhere ? ` ${elsewhere}` : ""}</span>
        </div>
      </Banner>
      {dialog === "ack" ? <AcknowledgeModal id={id} pending={pending} onClose={() => setDialog(null)} /> : null}
      {dialog === "update" ? <UpdateDraftsModal id={id} name={name} mode="change" agents={pending.agents} reason={pending.title.toLowerCase()} onClose={() => setDialog(null)} /> : null}
    </>
  );
}

function ProposalCard({ id, p }: { id: string; p: Proposal }) {
  const accept = useStore((s) => s.acceptProposal);
  const dismiss = useStore((s) => s.dismissProposal);
  return (
    <Banner tone="neutral" title={<span className="flex items-center gap-2"><AgentChip agent="historian" />Proposal: {p.title}</span>}>
      <p>{p.text}</p>
      <p className="mt-1.5 rounded-xl bg-white/70 px-3 py-2">Under “{p.stepTitle}”: <b>If</b> {conditionText(p.cond)} → {STEP_KIND_LABEL[p.kind]}. {p.result}</p>
      <div className="mt-3 flex gap-2.5">
        <Button variant="primary" size="sm" onClick={() => accept(id, p.id)}>Accept proposal</Button>
        <Button size="sm" onClick={() => dismiss(id, p.id)}>Dismiss</Button>
        <span className="self-center text-xs">Historian never edits the workflow on its own.</span>
      </div>
    </Banner>
  );
}

export function ChangesTab({ id, name, cfg }: { id: string; name: string; cfg: PayerConfig }) {
  return (
    <div className="flex flex-col gap-4">
      {cfg.pending ? <PendingBanner id={id} name={name} pending={cfg.pending} /> : <p className="px-1 text-sm text-muted">Nothing is waiting for you. Changes here are demo data, not read from {name}'s policy.</p>}
      {cfg.proposals.map((p) => <ProposalCard key={p.id} id={id} p={p} />)}
      <Card>
        <CardHeader title="What changed" />
        {cfg.changes.map((c) => (
          <div key={c.id} className="flex items-start gap-4 border-b border-line px-6 py-3.5 last:border-b-0">
            <span className="w-12 shrink-0 pt-0.5 text-muted">{c.date}</span>
            <div>
              <div className="font-semibold">{c.title}</div>
              <div className="text-[13.5px] text-muted">{c.text}</div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
