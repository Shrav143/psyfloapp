import type { ReactNode } from "react";
import { Check, Minus, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Misc";

/** done: found or filled. missing: nothing yet. warn: found, but something is wrong. working: an agent is reading it. optional: nice to have, not needed. */
export type CheckState = "done" | "missing" | "warn" | "working" | "optional";

const BOX: Record<CheckState, string> = {
  done: "border-forest bg-forest text-white",
  missing: "border-[#D9B25C] bg-white",
  warn: "border-[#D9B25C] bg-mid-bg text-mid-ink",
  working: "border-field bg-white",
  optional: "border-dashed border-faint bg-white text-faint",
};
const WORD: Record<CheckState, string> = { done: "Done", missing: "Missing", warn: "Check this", working: "Reading", optional: "Optional" };

/** The box at the left of a row. The word is for screen readers; the row's text carries the meaning for everyone else. */
export function CheckBox({ state }: { state: CheckState }) {
  return (
    <span aria-label={WORD[state]} role="img" className={cn("mt-px grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px] border-[1.5px]", BOX[state])}>
      {state === "done" ? <Check size={14} strokeWidth={3} className="ico" /> : null}
      {state === "warn" ? <TriangleAlert size={12} className="ico" /> : null}
      {state === "working" ? <Spinner size={14} /> : null}
      {state === "optional" ? <Minus size={12} className="ico" /> : null}
    </span>
  );
}

/** "7 of 12 ready" with a bar. `right` holds the one button that moves the person on. */
export function ChecklistProgress({ done, total, label = "ready", right }: { done: number; total: number; label?: string; right?: ReactNode }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const full = total > 0 && done === total;
  return (
    <div className="flex items-center gap-5">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="font-serif text-[18px] leading-none font-semibold">
            {done} of {total} {label}
          </span>
          <span className={cn("text-[13px]", full ? "font-medium text-good-ink" : "text-muted")}>{full ? "Nothing is missing" : `${total - done} to go`}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#EAE8E3]" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label={`${done} of ${total} ${label}`}>
          <div className={cn("h-full rounded-full transition-[width] duration-500", full ? "bg-good" : "bg-forest")} style={{ width: `${pct}%` }} />
        </div>
      </div>
      {right}
    </div>
  );
}

/** A heading and the rows under it. One list, not one card per item. */
export function ChecklistGroup({ title, done, total, children }: { title: string; done?: number; total?: number; children: ReactNode }) {
  return (
    <section className="border-t border-line first:border-t-0">
      <div className="flex items-center justify-between px-6 pt-5 pb-1.5">
        <h3 className="text-[11px] font-medium tracking-[0.1em] text-muted uppercase">{title}</h3>
        {done !== undefined && total !== undefined ? <span className="text-xs text-muted">{done} of {total}</span> : null}
      </div>
      <ul className="flex flex-col pb-2">{children}</ul>
    </section>
  );
}

/** One thing that is needed. `detail` says what was found, or what is missing. `action` sits at the right. `children` is the editor that opens under the row. */
export function ChecklistItem({ state, label, detail, tag, action, children, source }: { state: CheckState; label: ReactNode; detail?: ReactNode; tag?: string; action?: ReactNode; children?: ReactNode; source?: ReactNode }) {
  return (
    <li className={cn("px-6 py-3", state === "missing" && "bg-[#FDFAF2]")}>
      <div className="flex items-start gap-3.5">
        <CheckBox state={state} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2.5">
            <span className={cn("font-medium", state === "optional" && "text-ink2")}>{label}</span>
            {tag ? <span className="text-xs text-muted">{tag}</span> : null}
          </div>
          {detail ? <div className={cn("mt-0.5 text-[13px]", state === "done" ? "text-ink2" : state === "warn" ? "text-mid-ink" : state === "missing" ? "text-mid-ink" : "text-muted")}>{detail}</div> : null}
          {source ? <div className="mt-1.5 flex flex-wrap gap-1.5">{source}</div> : null}
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
      {children ? <div className="mt-3 ml-[36px]">{children}</div> : null}
    </li>
  );
}
