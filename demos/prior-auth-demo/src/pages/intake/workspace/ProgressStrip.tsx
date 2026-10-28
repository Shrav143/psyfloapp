import { Link } from "react-router-dom";
import { Meter } from "@/components/ui";
import type { Tone } from "@/data/types";
import { cn } from "@/lib/cn";
import { workspaceHref } from "./nav";
import type { ProgressCell } from "./progress";

const TEXT: Record<Tone, string> = { good: "text-good-ink", mid: "text-mid-ink", risk: "text-risk-ink", neutral: "text-ink2" };
const BAR: Record<Tone, string> = { good: "#2E7D52", mid: "#A87A26", risk: "#B5553A", neutral: "#217A78" };

/** The progress indicators: referral, coverage, assessments, clinical and administrative readiness (kept apart), care plan, authorization. Each is a link to where it is dealt with. */
export function ProgressStrip({ recordId, cells }: { recordId: string; cells: ProgressCell[] }) {
  return (
    <ul aria-label="Progress" className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(138px,1fr))] gap-2 p-0">
      {cells.map((c) => {
        const body = (
          <>
            <span className="block truncate text-[12px] text-muted" title={c.label}>{c.label}</span>
            <span className={cn("mt-0.5 flex items-center gap-1.5 text-[13px] font-semibold", TEXT[c.tone])} title={c.detail}>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
              <span className="truncate">{c.value}</span>
            </span>
            {c.ratio && c.ratio.total ? (
              <span className="mt-1.5 flex items-center gap-2">
                <Meter value={(c.ratio.done / c.ratio.total) * 100} color={BAR[c.tone]} height={4} className="min-w-0 flex-1" />
                <span className="shrink-0 text-[11px] text-muted">{c.ratio.done} of {c.ratio.total}</span>
              </span>
            ) : null}
          </>
        );
        const cls = "block min-w-0 rounded-xl border border-line bg-tile px-3 py-1.5 hover:border-field hover:bg-white";
        return (
          <li key={c.key} data-progress={c.key} className="min-w-0">
            {c.href ? <Link to={c.href} className={cls}>{body}</Link> : <Link to={workspaceHref(recordId, c.to ?? { section: "overview" })} className={cls}>{body}</Link>}
          </li>
        );
      })}
    </ul>
  );
}
