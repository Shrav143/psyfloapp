import { useState } from "react";
import { Eye, RotateCcw } from "lucide-react";
import { Button, Dropdown, EmptyState, Pill } from "@/components/ui";
import type { WorkflowStatus } from "@/data/workflow/types";
import { stamp } from "@/lib/time";
import { useVersionsApi, type VersionRow } from "../lib/versionsApi";
import { WorkflowViewPanel } from "../studio";

const STATUS: Record<WorkflowStatus, { label: string; tone: "good" | "mid" | "neutral" }> = { published: { label: "Published", tone: "good" }, draft: { label: "Draft", tone: "mid" }, archived: { label: "Archived", tone: "neutral" } };
const ALL = "all";

/** Every save, publish, archive and restore of this payer's workflows: who, when, why, which version and what status it had. A row opens that version in a right-hand panel
    (read only, with its path) and can be restored as a draft. Restoring never touches the published version: the draft is reviewed and published like any other, so it needs no reason. */
export function VersionsSection({ payerId }: { payerId: string }) {
  const api = useVersionsApi(payerId);
  const [which, setWhich] = useState<string>(ALL);
  const [viewing, setViewing] = useState<VersionRow | null>(null);
  const rows = which === ALL ? api.rows : api.rows.filter((r) => r.workflowId === which);
  if (!api.rows.length) return <EmptyState title="No saved versions yet">Every save, publish, archive and restore of a workflow is listed here with who, when and why.</EmptyState>;
  return (
    <div className="flex flex-col gap-3 px-6 py-5">
      {api.workflows.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium text-ink2">Workflow</span>
          <Dropdown ariaLabel="Workflow" value={which} defaultValue={ALL} options={[{ value: ALL, label: "All workflows" }, ...api.workflows.map((w) => ({ value: w.id, label: w.name }))]} onChange={setWhich} menuWidth={320} />
        </div>
      ) : null}
      <ol className="flex flex-col" aria-label="Workflow versions, newest first">
        {rows.map((r) => (
          <li key={`${r.workflowId}-${r.version}-${r.status}-${r.savedAt}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line py-3 first:border-t-0">
            <div className="min-w-[220px] flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{r.name}</span>
                <span className="text-sm text-muted">version {r.version}</span>
                <Pill tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Pill>
              </div>
              <div className="mt-0.5 text-xs text-muted">{r.savedBy} · {stamp(r.savedAt)} · Reason: {r.reason || "none given"}</div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" icon={Eye} onClick={() => setViewing(r)} aria-label={`View ${r.name} version ${r.version}`}>View</Button>
              <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => api.restore(r.workflowId, r.version)} aria-label={`Restore ${r.name} version ${r.version} as a draft`}>Restore as draft</Button>
            </div>
          </li>
        ))}
      </ol>
      {viewing ? <WorkflowViewPanel open workflowId={viewing.workflowId} version={viewing.version} onClose={() => setViewing(null)} /> : null}
    </div>
  );
}
