import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { AgentBadge, Button, Chip, Modal, Spinner } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import { OPEN_DRAFT_STATUS } from "@/data/payerConfig";
import { PROGRAM_LABEL, type AgentKey } from "@/data/types";
import { sleep } from "@/lib/format";
import { useStore } from "@/store";
import { useOpenDrafts } from "./lib/drafts";
import { useAlive } from "./lib/useAlive";

const STEP_MS = 1500;

/** Confirm step for Update drafts: lists the payer's open drafts, then two agents redraft (about 3 seconds). Mounted only while open.
    `mode` "change" finishes a payer change; "edits" redrafts open drafts after the user's own edits. Requests already sent are never listed or rewritten. */
export function UpdateDraftsModal({ id, name, mode = "edits", agents = ["scribe", "integrity"], reason, onClose }: { id: string; name: string; mode?: "change" | "edits"; agents?: AgentKey[]; reason: string; onClose: () => void }) {
  const alive = useAlive();
  const drafts = useOpenDrafts(id);
  const [step, setStep] = useState<number | null>(null);
  const busy = step !== null;
  const count = drafts.length;
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

  const first = AGENTS[agents[0]].name;
  const second = AGENTS[agents[1] ?? agents[0]].name;
  const lines = count ? [`${first} is redrafting ${count} ${noun}`, `${second} is checking every sentence against the chart`] : [`${first} is setting the change up for new drafts`, `${second} is checking the document lists`];

  return (
    <Modal open size="md" onClose={busy ? () => undefined : onClose} title={count ? `Update ${count} ${noun}?` : "Apply to new drafts?"} subtitle={`Nothing is redrafted until you confirm. Reason: ${reason}.`} footer={<><Button onClick={onClose} disabled={busy}>Cancel</Button><Button variant="primary" loading={busy} onClick={run}>{count ? `Update ${count} ${noun}` : "Apply to new drafts"}</Button></>}>
      <div className="flex flex-col gap-4">
        {count ? (
          <div className="overflow-hidden rounded-2xl border border-edge">
            {drafts.map((d) => (
              <div key={d.id} className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0">
                <span className="w-[62px] font-semibold">{d.id}</span>
                <span className="flex-1 text-sm text-ink2">{d.patient} · {name}</span>
                {d.program ? <Chip>{PROGRAM_LABEL[d.program]}</Chip> : null}
                <span className="w-[190px] text-right text-[13px] text-muted">{OPEN_DRAFT_STATUS}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink2">No open drafts are affected. {mode === "change" ? `${name} will use the change for every new draft from now on.` : `New drafts for ${name} already use your edits.`}</p>
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
          <p className="text-[13px] text-muted">{count ? "Each redrafted case returns to Case Manager for a new signature. " : ""}Requests already sent keep what they were sent with.</p>
        )}
      </div>
    </Modal>
  );
}
