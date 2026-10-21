import { ArrowRight } from "lucide-react";
import { Chip, Drawer, EmptyState } from "@/components/ui";
import type { EditLogEntry } from "@/data/payerConfig";
import { stamp } from "@/lib/time";

/** Every edit to a workflow, rule, script, document list or payer detail, with who, when, why, the old text and the new text. */
export function EditLogDrawer({ name, edits, onClose }: { name: string; edits: EditLogEntry[]; onClose: () => void }) {
  return (
    <Drawer open onClose={onClose} width={680} title="Edit log" subtitle={`Every edit to ${name}, newest first`}>
      {edits.length ? (
        <ol className="flex flex-col gap-3">
          {edits.map((e) => (
            <li key={e.id} className="rounded-2xl border border-edge bg-white p-4">
              <div className="flex flex-wrap items-center gap-2"><Chip>{e.area}</Chip><span className="font-semibold">{e.what}</span></div>
              <div className="mt-1 text-xs text-muted">{e.user} · {stamp(e.at)} · Reason: {e.reason}</div>
              <div className="mt-2.5 grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 text-[13px]">
                <div className="rounded-xl bg-risk-bg px-3 py-2 text-risk-ink"><div className="mb-0.5 text-[11px] font-medium tracking-[0.08em] uppercase">Before</div>{e.before || "Nothing"}</div>
                <ArrowRight size={15} className="ico self-center text-muted" />
                <div className="rounded-xl bg-good-bg px-3 py-2 text-good-ink"><div className="mb-0.5 text-[11px] font-medium tracking-[0.08em] uppercase">After</div>{e.after || "Removed"}</div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState title="No edits yet">Every edit to a workflow, rule, script or document list is logged here with your name, the time and your reason.</EmptyState>
      )}
    </Drawer>
  );
}
