import { useState } from "react";
import { ArrowRight, Check, Megaphone, WandSparkles } from "lucide-react";
import { Banner, Button, Modal } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import { PROGRAM_LABEL, PROGRAMS, type CoreProgram } from "@/data/types";
import type { PayerConfig, PendingChange } from "@/data/payerConfig";
import { viewerById } from "@/data/viewers";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import { joinWords } from "../lib/checker";
import { docsChanges } from "../lib/diffs";
import { useOpenDrafts, useOtherSiteNote } from "../lib/drafts";
import { useChangeImpact } from "../lib/impact";
import { UpdateDraftsModal } from "../UpdateDraftsModal";
import { ImpactPanel } from "./ImpactPanel";

function AcknowledgeModal({ id, pending, onClose }: { id: string; pending: PendingChange; onClose: () => void }) {
  const viewerName = viewerById(useStore((s) => s.viewerId)).name;
  return (
    <Modal open size="sm" onClose={onClose} title="Acknowledge this change?" subtitle="It records who saw the change and when." footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={Check} onClick={() => { useStore.getState().acknowledgeChange(id); onClose(); }}>Acknowledge change</Button></>}>
      <div className="flex flex-col gap-3 text-sm">
        <div className="rounded-2xl bg-tile px-4 py-3"><b>{pending.title}</b><div className="mt-0.5 text-ink2">{pending.text} Effective {pending.effective}.</div></div>
        <p className="text-ink2">You are acknowledging as {viewerName}. This does not change any draft or any workflow. Applying the change is a separate step.</p>
      </div>
    </Modal>
  );
}

/** What the change does to the lists, before and after, in one box: each level of care it touches with the number of documents, and the documents it adds.
    A change with no document lists says so. */
function BeforeAfter({ cfg, pending }: { cfg: PayerConfig; pending: PendingChange }) {
  const programs = PROGRAMS.filter((p) => pending.docAdds.some((a) => a.program === p));
  if (!programs.length) {
    return <p className="rounded-xl bg-white/70 px-3 py-2 text-[13px]"><b className="font-semibold">Before and after:</b> no document list changes. New drafts use {pending.title.toLowerCase()} once you apply the change.</p>;
  }
  const after = (program: CoreProgram) => pending.docAdds.reduce((list, a) => (a.program !== program || list.some((x) => x.title === a.item.title) ? list : [...list, a.item]), cfg.docs[program]);
  const added = [...new Set(programs.flatMap((p) => docsChanges(cfg.docs[p], after(p)).map((l) => l.after)))];
  return (
    <div className="grid grid-cols-1 items-stretch gap-2 text-[13px] @lg:grid-cols-[1fr_auto_1fr]">
      <div className="rounded-xl bg-white/70 px-3 py-2 text-ink2">
        <div className="mb-0.5 text-[11px] font-medium tracking-[0.08em] uppercase">Before</div>
        {programs.map((p) => `${PROGRAM_LABEL[p]}: ${cfg.docs[p].length} documents`).join(" · ")}
      </div>
      <ArrowRight size={15} className="ico hidden self-center text-muted @lg:block" aria-label="becomes" />
      <div className="rounded-xl bg-good-bg px-3 py-2 text-good-ink">
        <div className="mb-0.5 text-[11px] font-medium tracking-[0.08em] uppercase">After</div>
        {programs.map((p) => `${PROGRAM_LABEL[p]}: ${after(p).length}`).join(" · ")}. Adds {added.join("; ")}.
      </div>
    </div>
  );
}

/** The change waiting for a person, the first thing on History & Changes. It shows what changed (the rule, its source and effective date, before and after) and who it touches
    (workflows, open cases, the owner). Acknowledge records a person. "Review & apply changes" opens the Update drafts step, and stays off until the change is acknowledged.
    Applying redrafts only unsent drafts for a new signature: a submitted packet is never rewritten and no case is moved to another workflow version. */
export function PendingChangeCard({ id, name, cfg, pending }: { id: string; name: string; cfg: PayerConfig; pending: PendingChange }) {
  const [dialog, setDialog] = useState<"ack" | "update" | null>(null);
  const drafts = useOpenDrafts(id);
  const elsewhere = useOtherSiteNote(id);
  const impact = useChangeImpact(id, cfg, pending);
  const n = drafts.length;
  const ack = pending.acknowledged;
  return (
    <>
      <Banner tone="mid" icon={Megaphone} title={pending.title} className="@container">
        <p>
          {pending.text}{" "}
          {n ? `${AGENTS[pending.agents[0]].name} can redraft the ${n} ${n === 1 ? "draft" : "drafts"} that ${n === 1 ? "is" : "are"} not yet sent: ${joinWords(drafts.map((d) => d.id))}. Requests already sent keep what they were sent with.` : `No open drafts are affected. New drafts for ${name} use the change once you apply it.`}
        </p>
        <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-0 text-[13px] @md:grid-cols-[130px_minmax(0,1fr)] @md:gap-y-1">
          <dt className="font-medium">The rule that changed</dt>
          <dd>{impact.ruleLine}</dd>
          <dt className="mt-1 font-medium @md:mt-0">Source and date</dt>
          <dd>{impact.sourceLine} Effective {pending.effective}.</dd>
        </dl>
        <div className="mt-3"><BeforeAfter cfg={cfg} pending={pending} /></div>
        <ImpactPanel id={id} impact={impact} />
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          {ack ? (
            <span className="inline-flex h-[38px] items-center gap-2 rounded-xl bg-good-bg px-4 font-medium text-good-ink"><Check size={16} className="ico" />Acknowledged by {ack.by}, {stamp(ack.at)}</span>
          ) : (
            <Button variant="primary" icon={Check} onClick={() => setDialog("ack")}>Acknowledge change</Button>
          )}
          <Button icon={WandSparkles} disabled={!ack} title={ack ? undefined : "Acknowledge the change first"} onClick={() => setDialog("update")}>Review & apply changes</Button>
          <span className="max-w-[460px] text-xs">
            {n ? "Acknowledging records who saw it. Applying redrafts the unsent drafts, and each returns to Case Manager for a new signature." : "Acknowledging records who saw it. Applying makes new drafts use the change."} A submitted packet is never rewritten, and no active case is moved to another workflow version without a person reviewing it.{elsewhere ? ` ${elsewhere}` : ""}
          </span>
        </div>
      </Banner>
      {dialog === "ack" ? <AcknowledgeModal id={id} pending={pending} onClose={() => setDialog(null)} /> : null}
      {dialog === "update" ? <UpdateDraftsModal id={id} name={name} mode="change" agents={pending.agents} reason={pending.title.toLowerCase()} onClose={() => setDialog(null)} /> : null}
    </>
  );
}
