import { Link } from "react-router-dom";
import { Meter } from "@/components/ui";
import type { Tone } from "@/data/types";
import { cn } from "@/lib/cn";
import { workspaceHref } from "./nav";
import type { ProgressCell } from "./progress";

const TEXT: Record<Tone, string> = { good: "text-good-ink", mid: "text-mid-ink", risk: "text-risk-ink", neutral: "text-ink2" };
const BAR: Record<Tone, string> = { good: "#2E7D52", mid: "#A87A26", risk: "#B5553A", neutral: "#217A78" };

/** The progress indicators: referral, coverage, assessments, clinical and administrative readiness (kept apart), care plan, authorization. Each is a link to
    where it is dealt with. Wide: small tiles with a bar for the ratios. Narrow: one line each, so the header stays short. */
export function ProgressStrip({ recordId, cells }: { recordId: string; cells: ProgressCell[] }) {
  return (
    <ul aria-label="Progress" className="m-0 flex list-none flex-wrap gap-1.5 p-0 @5xl:grid @5xl:grid-cols-[0.9fr_1fr_1fr_1.15fr_1.35fr_0.9fr_1fr] @5xl:gap-2">
      {cells.map((c) => {
        const hasRatio = !!c.ratio && c.ratio.total > 0;
        const to = c.href ?? workspaceHref(recordId, c.to ?? { section: "overview" });
        return (
          <li key={c.key} data-progress={c.key} className="min-w-0 @5xl:flex">
            <Link
              to={to}
              title={c.detail}
              className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 rounded-full border border-line bg-tile px-3 py-1 hover:border-field hover:bg-white @5xl:block @5xl:w-full @5xl:rounded-xl @5xl:py-1.5"
            >
              <span className="text-[12px] leading-snug text-muted @5xl:block">{c.label}</span>
              <span className={cn("flex items-center gap-1.5 text-[13px] font-semibold @5xl:mt-0.5", TEXT[c.tone])}>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
                <span className="leading-snug">{c.value}</span>
                {hasRatio ? <span className="text-[12px] font-normal text-muted @5xl:hidden">· {c.ratio?.done} of {c.ratio?.total}{c.unit ? ` ${c.unit}` : ""}</span> : null}
              </span>
              {hasRatio && c.ratio ? (
                <span className="hidden items-center gap-2 @5xl:mt-1.5 @5xl:flex">
                  <Meter value={(c.ratio.done / c.ratio.total) * 100} color={BAR[c.tone]} height={4} className="min-w-0 flex-1" />
                  <span className="shrink-0 text-[11px] text-muted">{c.ratio.done} of {c.ratio.total}{c.unit ? ` ${c.unit}` : ""}</span>
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
