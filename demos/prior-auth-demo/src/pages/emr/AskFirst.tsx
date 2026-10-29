import { Link } from "react-router-dom";
import { Button, Modal } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import type { AgentKey } from "@/data/types";
import { paths } from "@/routes";

export interface Asking { agent: AgentKey; title: string; body: string; label: string; run: () => void }

/** The agent's freedom in Settings is "Ask before acting", so the step waits for a yes. Mounted only while open. */
export function AskFirst({ asking, onClose }: { asking: Asking; onClose: () => void }) {
  const name = AGENTS[asking.agent].name;
  return (
    <Modal open size="sm" onClose={onClose} title={asking.title} subtitle={`${name} is set to Ask before acting`} footer={
      <>
        <Button onClick={onClose}>Not now</Button>
        <Button variant="primary" onClick={() => { onClose(); asking.run(); }}>{asking.label}</Button>
      </>
    }>
      <p className="text-sm text-ink2">{asking.body}</p>
      <p className="mt-3 text-[13px] text-muted">Change this for {name} in <Link to={paths.settings()} className="font-semibold text-forest underline underline-offset-[3px]">Settings</Link>.</p>
    </Modal>
  );
}
