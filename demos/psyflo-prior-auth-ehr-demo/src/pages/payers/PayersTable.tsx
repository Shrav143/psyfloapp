import { Link } from "react-router-dom";
import { Pill } from "@/components/ui";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/time";
import { paths } from "@/routes";
import { statusOf, WF_STATUS_LABEL, type PayerRow } from "./lib/payers";
import { stateName } from "./lib/states";

/* Wide: six columns. Narrow: the same facts on two lines. The card around the list is an @container, so it follows the room it has, not the window. */
const GRID = "@4xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_84px_128px_132px]";

const workflowsText = (r: PayerRow): string => {
  if (!r.published && !r.drafts) return "None yet";
  return [r.published ? `${r.published} published` : "", r.drafts ? `${r.drafts} ${r.drafts === 1 ? "draft" : "drafts"}` : ""].filter(Boolean).join(" · ");
};

function Row({ r, onOpen }: { r: PayerRow; onOpen: (id: string) => void }) {
  const status = statusOf(r);
  return (
    <li>
      <div
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest("a")) onOpen(r.id);
        }}
        className={cn("flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-6 py-3.5 hover:bg-[#FBF8F3] @4xl:grid", GRID)}
      >
        <div className="order-1 min-w-[55%] flex-1 @4xl:order-none">
          <Link to={paths.payers(r.id)} className="block truncate font-semibold hover:text-forest hover:underline" title={r.name}>{r.name}</Link>
          {r.org !== r.name ? <span className="block truncate text-xs text-muted">{r.org}</span> : null}
        </div>
        <div aria-hidden="true" className="order-3 h-0 basis-full @4xl:hidden" />
        <div className="order-4 min-w-0 text-[13px] text-ink2 @4xl:order-none @4xl:text-sm @4xl:text-ink">
          {r.product}
          <span className="text-muted @4xl:block @4xl:text-xs"><span className="@4xl:hidden"> · </span>{stateName(r.state)}</span>
        </div>
        <div className="order-5 text-[13px] text-ink2 @4xl:order-none @4xl:text-sm @4xl:text-ink">
          <span className="text-xs text-muted @4xl:hidden">Workflows: </span>
          {workflowsText(r)}
        </div>
        <div className="order-6 text-[13px] whitespace-nowrap text-ink2 @4xl:order-none @4xl:text-sm">
          <span className="text-xs text-muted @4xl:hidden">Updated </span>
          {r.lastUpdate === null ? "None" : shortDate(r.lastUpdate)}
        </div>
        <div className="order-2 @4xl:order-none">
          <Pill tone={status === "published" ? "good" : status === "drafts" ? "mid" : "neutral"}>{WF_STATUS_LABEL[status]}</Pill>
        </div>
        <div className={cn("order-7 flex items-center gap-1.5 text-[12px] font-semibold whitespace-nowrap @4xl:order-none", r.waiting ? "text-mid-ink" : "text-muted")}>
          <span className={cn("h-[9px] w-[9px] shrink-0 rounded-full", r.waiting ? "bg-mid" : "bg-good")} role="img" aria-label={r.waiting ? "Change waiting" : "No change waiting"} />
          {r.waiting ? "Change waiting" : <span className="font-normal"><span className="@4xl:hidden">No change waiting</span><span className="hidden @4xl:inline">None</span></span>}
        </div>
      </div>
    </li>
  );
}

const HEAD = ["Payer and organization", "Product and state", "Workflows", "Last update", "Status", "Pending rule changes"];

/** One row per payer. The name is a real link; the whole row opens the payer's workspace too. */
export function PayersTable({ rows, onOpen }: { rows: PayerRow[]; onOpen: (id: string) => void }) {
  return (
    <div>
      <div className={cn("hidden gap-x-4 border-t border-line bg-[#FBF8F3] px-6 py-2 text-[11px] font-medium tracking-[0.09em] text-muted uppercase @4xl:grid", GRID)} aria-hidden="true">
        {HEAD.map((h) => <span key={h}>{h}</span>)}
      </div>
      <ul aria-label="Payers">
        {rows.map((r) => <Row key={r.id} r={r} onOpen={onOpen} />)}
      </ul>
    </div>
  );
}
