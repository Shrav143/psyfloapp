import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { AgentBadge, Button, Chip, Modal, Spinner } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL, type AgentKey } from "@/data/types";
import { sleep } from "@/lib/format";
import { useStore } from "@/store";
import { useAlive } from "./lib/useAlive";

const STEP_MS = 1500;

/** Confirm gate for Update drafts: lists the drafts, then two agents redraft (about 3 seconds). Mounted only while open.
    `mode` "change" finishes a payer change; "edits" redrafts open drafts after the user's own edits. */
export function UpdateDraftsModal({ id, name, mode = "edits", draftIds, agents = ["scribe", "integrity"], reason, onClose }: { id: string; name: string; mode?: "change" | "edits"; draftIds: string[]; agents?: AgentKey[]; reason: string; onClose: () => void }) {
  const alive = useAlive();
  const requests = useStore((s) => s.requests);
  const [step, setStep] = useState<number | null>(null);
  const busy = step !== null;
  const count = draftIds.length;
  const noun = count === 1 ? "draft" : "drafts";

  const run = async () => {
    for (let i = 0; i < 2; i += 1) {
      setStep(i);
      await sleep(STEP_MS);
      if (!alive.current) return;
    }
    const s = useStore.getState();
    if (mode === "change") s.updateDrafts(id);
    else s.updateOpenDrafts(id);
    onClose();
  };

  const status = (stage: string | undefined) => (stage === "preparing" ? "Draft, not yet sent" : stage === "info_requested" ? "Answer drafted, not yet sent" : stage ? "Already sent. Gets an addendum" : "Draft");
  const lines = [`${AGENTS[agents[0]].name} is redrafting ${count} ${noun}`, `${AGENTS[agents[1] ?? agents[0]].name} is checking every sentence against the chart`];

  return (
    <Modal open size="md" onClose={busy ? () => undefined : onClose} title={count ? `Update ${count} ${noun}?` : "Apply to new drafts?"} subtitle={`Confirm gate. Nothing is redrafted until you say so. Reason: ${reason}.`} footer={<><Button onClick={onClose} disabled={busy}>Cancel</Button><Button variant="primary" loading={busy} onClick={run}>{count ? `Update ${count} ${noun}` : "Apply to new drafts"}</Button></>}>
      <div className="flex flex-col gap-4">
        {count ? (
          <div className="overflow-hidden rounded-2xl border border-edge">
            {draftIds.map((d) => {
              const r = requests.find((x) => x.id === d);
              return (
                <div key={d} className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0">
                  <span className="w-[62px] font-semibold">{d}</span>
                  <span className="flex-1 text-sm text-ink2">{r ? `${r.patient.initials}, ${r.patient.age} · ${payerById(r.payerId).shortName}` : "Not on the Dashboard"}</span>
                  {r ? <Chip>{PROGRAM_LABEL[r.program]}</Chip> : null}
                  <span className="w-[170px] text-right text-[13px] text-muted">{status(r?.stage)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-ink2">No open drafts are affected. {name} will use the change for every new draft from now on.</p>
        )}
        {busy ? (
          <ol className="flex flex-col gap-2.5" aria-label="Redraft progress">
            {lines.map((l, i) => (
              <li key={l} className="flex items-center gap-3">
                <AgentBadge agent={agents[Math.min(i, agents.length - 1)]} size={30} />
                <span className={i > step ? "flex-1 text-muted" : "flex-1"}>{l}</span>
                {i < step ? <CheckCircle2 size={18} className="ico text-good" aria-label="Done" /> : i === step ? <Spinner /> : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-[13px] text-muted">Each redrafted case returns to Active Cases for a new signature. A request that is already sent is never rewritten. It gets an addendum instead.</p>
        )}
      </div>
    </Modal>
  );
}
