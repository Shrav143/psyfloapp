import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Chip, EmptyState } from "@/components/ui";
import type { EditArea, EditLogEntry } from "@/data/payerConfig";
import { cn } from "@/lib/cn";
import { stamp } from "@/lib/time";

export const AUDIT_AREAS: EditArea[] = ["Workflow", "Rules", "Documents", "Caller instructions", "Payer details"];

/** Every edit to a workflow, rule, script, document list or payer detail, newest first, with who, when, why, the old text and the new text. A row of area buttons narrows the list. */
export function AuditList({ edits }: { edits: EditLogEntry[] }) {
  const [area, setArea] = useState<EditArea | "all">("all");
  const shown = area === "all" ? edits : edits.filter((e) => e.area === area);
  return (
    <div className="@container flex flex-col gap-3">
      {edits.length ? (
        <div role="group" aria-label="Filter by area" className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium text-ink2">Area</span>
          {(["all", ...AUDIT_AREAS] as const).map((a) => (
            <button key={a} type="button" aria-pressed={area === a} onClick={() => setArea(a)} className={cn("h-[28px] rounded-full border px-3 text-[13px] font-medium", area === a ? "border-forest bg-[#F3F7F4] font-semibold text-forest" : "border-field bg-white text-ink2 hover:bg-tile")}>
              {a === "all" ? "All" : a}{a === "all" ? null : <span className="ml-1.5 text-xs font-normal text-muted">{edits.filter((e) => e.area === a).length}</span>}
            </button>
          ))}
          <span className="text-xs text-muted" aria-live="polite">{shown.length} {shown.length === 1 ? "edit" : "edits"}</span>
        </div>
      ) : null}
      {shown.length ? (
        <ol className="flex flex-col gap-3">
          {shown.map((e) => (
            <li key={e.id} className="rounded-2xl border border-edge bg-white p-4">
              <div className="flex flex-wrap items-center gap-2"><Chip>{e.area}</Chip><span className="font-semibold">{e.what}</span></div>
              <div className="mt-1 text-xs text-muted">{e.user} · {stamp(e.at)} · Reason: {e.reason}</div>
              <div className="mt-2.5 grid grid-cols-1 items-stretch gap-2 text-[13px] @lg:grid-cols-[1fr_auto_1fr]">
                <div className="rounded-xl bg-risk-bg px-3 py-2 text-risk-ink"><div className="mb-0.5 text-[11px] font-medium tracking-[0.08em] uppercase">Before</div>{e.before || "Nothing"}</div>
                <ArrowRight size={15} className="ico hidden self-center text-muted @lg:block" />
                <div className="rounded-xl bg-good-bg px-3 py-2 text-good-ink"><div className="mb-0.5 text-[11px] font-medium tracking-[0.08em] uppercase">After</div>{e.after || "Removed"}</div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState title={edits.length ? `No ${area} edits` : "No edits yet"}>{edits.length ? "Pick All to see every edit." : "Every edit to a workflow, rule, script or document list is logged here with your name, the time and your reason."}</EmptyState>
      )}
    </div>
  );
}
