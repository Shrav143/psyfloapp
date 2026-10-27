import { Ban, RotateCcw, Undo2 } from "lucide-react";
import { AgentBadge, Button, Pill, Spinner } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import { ROLE_LABEL, type AgentTask, type IntakeRecord } from "@/data/intake/types";
import type { Tone } from "@/data/types";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import { useIntakeNow } from "../lib/policyNow";
import { retryTask } from "./actions";

export const TASK_STATUS: Record<AgentTask["status"], { label: string; tone: Tone }> = {
  queued: { label: "Queued", tone: "neutral" }, running: { label: "Running", tone: "neutral" }, done: { label: "Done", tone: "good" }, needs_you: { label: "Needs you", tone: "mid" },
  blocked: { label: "Blocked", tone: "risk" }, error: { label: "Error", tone: "risk" }, cancelled: { label: "Cancelled", tone: "neutral" },
};
const APPROVAL: Record<AgentTask["approval"], string> = { none: "No approval needed", required: "Approval required", approved: "Approved by a person", rejected: "Rejected by a person" };

/** One agent action in the activity list: action, status, source, time, agent, approval requirement, result or error, and Retry, Cancel or Undo. */
export function TaskRow({ record, task: t }: { record: IntakeRecord; task: AgentTask }) {
  const now = useIntakeNow();
  const cancel = useStore((s) => s.cancelIntakeTask);
  const undo = useStore((s) => s.undoIntakeTask);
  const st = TASK_STATUS[t.status];
  const canUndo = !!t.undoable && t.status !== "cancelled" && t.status !== "queued" && t.status !== "running" && (t.kind !== "handoff" || record.handoff.status === "draft") && (t.kind === "handoff" || t.kind === "followups");
  return (
    <li data-task={t.id} data-status={t.status} className="flex items-start gap-2.5 border-b border-line px-4 py-2.5 last:border-b-0">
      <AgentBadge agent={t.agent} size={22} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0 text-[13px] font-semibold break-words">{t.action}</span>
          <Pill tone={st.tone} className="shrink-0">{t.status === "running" ? <Spinner size={11} /> : null}{st.label}</Pill>
        </div>
        <p className="mt-0.5 text-[12px] text-muted">
          {ROLE_LABEL[t.role]} ({AGENTS[t.agent].name}) · {stamp(t.at)} · {APPROVAL[t.approval]}
          {t.source ? ` · Source: ${t.source}` : ""}
        </p>
        {t.result ? <p className="mt-0.5 text-[12px] break-words text-ink2">{t.result}</p> : null}
        {t.status === "error" && t.error ? <p className="mt-1 rounded-lg bg-risk-bg px-2 py-1 text-[12px] text-risk-ink">{t.error}</p> : null}
        {(t.status === "error" && !t.retriedAs) || t.status === "queued" || t.status === "running" || canUndo ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {t.status === "error" && !t.retriedAs ? <Button size="sm" icon={RotateCcw} onClick={() => retryTask(record.id, t, now)}>Retry</Button> : null}
            {t.status === "queued" || t.status === "running" ? <Button size="sm" icon={Ban} onClick={() => cancel(record.id, t.id)}>Cancel</Button> : null}
            {canUndo ? <Button size="sm" icon={Undo2} onClick={() => undo(record.id, t.id)} aria-label={`Undo ${t.action}`}>Undo</Button> : null}
          </div>
        ) : null}
        {t.retriedAs ? <p className="mt-0.5 text-[12px] text-muted">Retried as a new run</p> : null}
      </div>
    </li>
  );
}
