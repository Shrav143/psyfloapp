import { useState } from "react";
import { History, RotateCcw } from "lucide-react";
import { Button, Drawer, Pill } from "@/components/ui";
import type { Workflow, WorkflowVersion } from "@/data/workflow/types";
import { cn } from "@/lib/cn";
import { stamp } from "@/lib/time";
import { WorkflowCanvas } from "./WorkflowCanvas";
import { AreaField } from "./fields/controls";
import { api, useVersions } from "./lib/store";
import { STATUS_TONE, STATUS_WORD, datesOf } from "./lib/ui";
import { REQUEST_TYPE_LABEL } from "@/data/workflow/types";

/* Every saved version of one workflow: who saved it, when, why. A version can be read on a canvas and restored as a new draft; nothing is overwritten. */

export function VersionHistoryDrawer({ workflow, onClose, onRestored }: { workflow: Workflow; onClose: () => void; onRestored: (id: string) => void }) {
  const versions = useVersions(workflow.id);
  const [pick, setPick] = useState<WorkflowVersion | null>(null);
  const [asking, setAsking] = useState<WorkflowVersion | null>(null);
  const [reason, setReason] = useState("");

  const restore = (v: WorkflowVersion) => {
    const id = api.restore(workflow.id, v.version);
    if (id) onRestored(id);
  };

  return (
    <Drawer open onClose={onClose} width={780} title="Version history" subtitle={`${workflow.name}. Every save and publish is kept, with who and why.`}>
      {versions.length === 0 ? (
        <p className="m-0 text-sm text-muted">No version has been saved yet.</p>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-2.5 p-0" aria-label="Versions, newest first">
          {versions.map((v, i) => {
            const open = pick?.version === v.version && pick.savedAt === v.savedAt;
            return (
              <li key={`${v.version}-${v.savedAt}`} className={cn("rounded-2xl border bg-white", open ? "border-forest" : "border-edge")}>
                <div className="flex flex-wrap items-start gap-3 px-4 py-3.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-neutral-bg font-serif text-[15px] font-semibold">v{v.version}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={STATUS_TONE[v.status]} dot>{STATUS_WORD[v.status]}</Pill>
                      {i === 0 ? <span className="text-xs text-muted">Latest saved</span> : null}
                    </div>
                    <p className="mt-1.5 mb-0 text-sm">{v.reason || "No reason recorded."}</p>
                    <p className="mt-0.5 mb-0 text-xs text-muted">{v.savedBy} · {stamp(v.savedAt)} · {v.nodes.length} steps</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" aria-expanded={open} onClick={() => setPick(open ? null : v)} icon={History}>{open ? "Hide preview" : "Preview"}</Button>
                    <Button size="sm" icon={RotateCcw} onClick={() => { setAsking(v); setReason(""); }}>Restore as a draft</Button>
                  </div>
                </div>
                {open ? (
                  <div className="border-t border-line p-3">
                    <p className="mt-0 mb-2.5 text-[13px] text-muted">
                      {v.meta.requestType === "any" ? "Any request type" : REQUEST_TYPE_LABEL[v.meta.requestType]} · {datesOf(v.meta.effectiveFrom, v.meta.effectiveTo)}. Read only.
                    </p>
                    <div style={{ height: 380 }}>
                      <WorkflowCanvas key={`${v.version}-${v.savedAt}`} nodes={v.nodes} edges={v.edges} readOnly ariaLabel={`Version ${v.version}, read only`} />
                    </div>
                  </div>
                ) : null}
                {asking?.version === v.version && asking.savedAt === v.savedAt ? (
                  <div className="border-t border-line bg-tile/60 px-4 py-3.5">
                    <p className="mt-0 mb-2 text-[13.5px] text-ink2">Restoring makes version {v.version}'s steps the new draft. The published version stays in force until a person publishes the draft.</p>
                    <div className="mt-3 flex justify-end gap-2">
                      <Button size="sm" onClick={() => setAsking(null)}>Cancel</Button>
                      <Button size="sm" variant="primary" onClick={() => restore(v)}>Restore as a new draft</Button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </Drawer>
  );
}
