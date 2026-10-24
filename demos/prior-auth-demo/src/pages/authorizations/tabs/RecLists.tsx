import { CheckCircle2, Undo2 } from "lucide-react";
import { Button, Pill } from "@/components/ui";
import type { Rec } from "@/data/caseDetail";
import { gainOf } from "@/data/caseModel";
import { plural } from "@/lib/format";

/** Applied recommendations collapse to one line with a green tick. Open one to see what the agents did. */
export function AppliedList({ recs }: { recs: Rec[] }) {
  return (
    <section aria-label="Applied" data-testid="applied-list" className="flex flex-col gap-2">
      <h3 className="mt-2 font-serif text-[16px] font-semibold">Applied <span className="font-sans text-[13px] font-normal text-muted">({recs.length})</span></h3>
      {recs.map((r) => (
        <details key={r.id} className="group rounded-2xl border border-good-edge bg-good-bg/60 px-4 py-2.5">
          <summary className="flex cursor-pointer list-none items-center gap-3">
            <CheckCircle2 size={16} className="ico text-good" aria-label="Applied" />
            <span className="flex-1 text-[14px] font-semibold">{r.title}</span>
            <Pill tone="good">+{plural(gainOf(r), "pt")} · applied</Pill>
          </summary>
          <ul className="mt-2 ml-[30px] list-disc pl-4 text-[13px] text-ink2">
            {r.bullets.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </details>
      ))}
    </section>
  );
}

export function DismissedList({ items, onRestore }: { items: { rec: Rec; reason: string }[]; onRestore: (id: string) => void }) {
  return (
    <section aria-label="Dismissed" data-testid="dismissed-list" className="flex flex-col gap-2">
      <h3 className="mt-2 font-serif text-[16px] font-semibold">Dismissed <span className="font-sans text-[13px] font-normal text-muted">({items.length})</span></h3>
      {items.map(({ rec, reason }) => (
        <div key={rec.id} className="flex items-center gap-3 rounded-2xl border border-edge bg-white px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="font-medium text-ink2 line-through decoration-[#C9BFB0]">{rec.title}</div>
            <div className="text-[12px] text-muted">{reason}</div>
          </div>
          <Button size="sm" variant="ghost" icon={Undo2} onClick={() => onRestore(rec.id)}>Bring back</Button>
        </div>
      ))}
    </section>
  );
}
