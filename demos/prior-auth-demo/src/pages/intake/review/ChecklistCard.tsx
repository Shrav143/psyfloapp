import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Card, CardHeader, ChecklistProgress } from "@/components/ui";
import { CATEGORY_LABEL, CATEGORY_ORDER, CHECK_LABEL, countBy, isOpen, type CheckItem, type CheckStatus } from "@/data/intake/checklist";
import { SECTION_LABEL } from "@/data/intake/types";
import { cn } from "@/lib/cn";
import { paths } from "@/routes";
import { CheckIcon, CheckPill } from "./pills";

type Show = "all" | "open" | CheckStatus;
const FILTERS: Show[] = ["all", "open", "missing", "verify", "pending", "blocked", "complete", "na"];

/** Where an item is fixed: its section (and the AI Scribe or Voice panel when it lives there). */
export function GoTo({ recordId, item, className }: { recordId: string; item: Pick<CheckItem, "section" | "panel" | "label">; className?: string }) {
  if (item.section === "review" && !item.panel) return null;
  return (
    <Link to={paths.intakeRecord(recordId, item.section, item.panel)} className={cn("inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold whitespace-nowrap text-forest hover:underline", className)} aria-label={`Go to ${SECTION_LABEL[item.section]} for ${item.label}`}>
      Go to {item.panel === "scribe" ? "AI Scribe" : item.panel === "voice" ? "Voice intake" : SECTION_LABEL[item.section]}
      <ArrowRight size={13} className="ico" />
    </Link>
  );
}

export function CheckRow({ recordId, item }: { recordId: string; item: CheckItem }) {
  return (
    <li data-check={item.id} data-status={item.status} className={cn("flex items-start gap-3 px-5 py-2.5", item.status === "missing" && "bg-[#FDFAF2]", item.status === "blocked" && "bg-risk-bg/50")}>
      <CheckIcon status={item.status} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[14px] font-medium">{item.label}</span>
          <CheckPill status={item.status} />
        </div>
        <p className="mt-0.5 text-[13px] text-ink2">{item.detail}</p>
      </div>
      <GoTo recordId={recordId} item={item} className="mt-0.5" />
    </li>
  );
}

/** The completeness checklist, grouped by category, with a status filter. It is derived from the record, so it follows every edit at once. */
export function ChecklistCard({ recordId, items }: { recordId: string; items: CheckItem[] }) {
  const [show, setShow] = useState<Show>("all");
  const c = countBy(items);
  const applicable = items.length - c.na;
  const open = items.filter((i) => isOpen(i.status)).length;
  const count = (f: Show) => (f === "all" ? items.length : f === "open" ? open : c[f]);
  const visible = items.filter((i) => show === "all" || (show === "open" ? isOpen(i.status) : i.status === show));
  return (
    <Card data-card="checklist">
      <CardHeader title="Intake completeness" />
      <div className="px-5 pt-4">
        <ChecklistProgress done={c.complete} total={applicable} label="complete" />
        <div role="group" aria-label="Show items" className="mt-3 flex flex-wrap gap-1.5">
          {FILTERS.filter((f) => f === "all" || f === "open" || c[f as CheckStatus] > 0).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={show === f}
              onClick={() => setShow(f)}
              className={cn("inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-semibold", show === f ? "border-forest bg-forest text-white" : "border-field bg-white text-ink2 hover:bg-tile")}
            >
              {f === "all" ? "All" : f === "open" ? "Open" : CHECK_LABEL[f]}
              <span className={cn("tabular-nums", show === f ? "text-white/80" : "text-muted")}>{count(f)}</span>
            </button>
          ))}
        </div>
      </div>
      {visible.length ? (
        CATEGORY_ORDER.map((cat) => {
          const rows = visible.filter((i) => i.category === cat);
          if (!rows.length) return null;
          const all = items.filter((i) => i.category === cat);
          const done = all.filter((i) => !isOpen(i.status)).length;
          return (
            <section key={cat} aria-label={CATEGORY_LABEL[cat]} className="mt-3 border-t border-line first-of-type:mt-4">
              <div className="flex items-center justify-between px-5 pt-3 pb-1">
                <h4 className="text-[11px] font-medium tracking-[0.1em] text-muted uppercase">{CATEGORY_LABEL[cat]}</h4>
                <span className="text-[12px] text-muted">{done} of {all.length} done</span>
              </div>
              <ul className="pb-1">{rows.map((i) => <CheckRow key={i.id} recordId={recordId} item={i} />)}</ul>
            </section>
          );
        })
      ) : (
        <div className="px-5 py-6 text-center text-[13px] text-muted">
          No items are {show === "open" ? "open" : CHECK_LABEL[show as CheckStatus].toLowerCase()}.{" "}
          <button type="button" className="font-semibold text-forest hover:underline" onClick={() => setShow("all")}>Show all</button>
        </div>
      )}
      <div className="h-2" />
    </Card>
  );
}
