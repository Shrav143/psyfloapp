import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, FolderOpen, Plus, Send, SearchX } from "lucide-react";
import { Button, Disclosure, EmptyState, Segmented, type TabItem } from "@/components/ui";
import { draftState, needsPerson, type CaseDraft } from "@/data/cases";
import { useScope } from "@/lib/scope";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { CaseRow } from "./CaseRow";
import type { ManagerFilters } from "./helpers";

type Status = "all" | "working" | "input" | "ready";

/** Most urgent first: cases that need a person, then the earliest due. */
const byUrgency = (a: CaseDraft, b: CaseDraft): number => Number(needsPerson(b)) - Number(needsPerson(a)) || (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity);
const statusOf = (d: CaseDraft): Exclude<Status, "all"> => {
  const s = draftState(d);
  return s === "working" ? "working" : s === "ready" ? "ready" : "input";
};

/** Search by case id or initials, then level of care and payer. */
function fits(d: CaseDraft, f: ManagerFilters): boolean {
  if (f.program !== "all" && d.program !== f.program) return false;
  if (f.payer !== "all" && d.payerId !== f.payer) return false;
  const q = f.q.trim().toLowerCase().replace(/[.\s-]/g, "");
  return !q || (d.caseId ?? "").toLowerCase().replace(/-/g, "").includes(q) || d.patient.initials.toLowerCase().replace(/\./g, "").includes(q);
}

/**
 * The cases the agents are still preparing, as one folded row above the tracker: how many, how many need a person, and a link to Authorizations,
 * where the same cases are worked. Opening the row shows the full list with its filters and row actions. Search, level of care and payer come from the page filters.
 */
export function PreparingCard({ filters, onClear }: { filters: ManagerFilters; onClear: () => void }) {
  const nav = useNavigate();
  const drafts = useStore((s) => s.caseDrafts);
  const sentToday = useStore((s) => s.caseSentToday);
  const scope = useScope();
  const [status, setStatus] = useState<Status>("all");

  // A case being prepared has its own site (chosen in Intake), which the case id follows.
  const active = useMemo(() => drafts.filter((d) => d.saved && !d.sent && scope.sites.includes(d.site)), [drafts, scope.sites]);
  const visible = useMemo(() => active.filter((d) => fits(d, filters)), [active, filters]);
  const count = (s: Exclude<Status, "all">) => visible.filter((d) => statusOf(d) === s).length;
  const rows = useMemo(() => visible.filter((d) => status === "all" || statusOf(d) === status).sort(byUrgency), [visible, status]);

  const items: TabItem<Status>[] = [
    { id: "all", label: "All" },
    { id: "working", label: "Agents working" },
    { id: "input", label: "Needs your input", badge: count("input") || undefined },
    { id: "ready", label: "Ready to sign", badge: count("ready") || undefined },
  ];
  const n = visible.length;
  const needs = visible.filter(needsPerson).length;
  const summary = active.length === 0 ? "Nothing is being prepared" : `${n === active.length ? `${n} being prepared` : `${n} of ${active.length} match the filters`}, ${needs} ${needs === 1 ? "needs" : "need"} you`;

  return (
    <div className="relative">
      <Disclosure title="Being prepared" summary={summary}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-4">
          <p className="text-[13px] text-muted">Most urgent first. Each case moves through eight steps; the agents do all but Ask and Sign.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link to={paths.authorizations()} className="inline-flex items-center gap-1 text-[13px] font-semibold text-forest hover:underline min-[900px]:hidden">
              Open in Authorizations<ArrowUpRight size={13} className="ico" aria-hidden="true" />
            </Link>
            <Button size="sm" variant="ghost" icon={Send} onClick={() => nav(paths.dashboard({ stage: "received" }))}>
              {sentToday.length} sent today
            </Button>
            <Segmented items={items} value={status} onChange={setStatus} />
          </div>
        </div>
        {active.length === 0 ? (
          <EmptyState icon={FolderOpen} title="Nothing is being prepared" action={<Button variant="primary" icon={Plus} onClick={() => nav(paths.newCase())}>Start a new case</Button>}>
            Start a case and the agents take it from there.
          </EmptyState>
        ) : rows.length === 0 ? (
          <EmptyState icon={SearchX} title="No cases match these filters" action={<Button variant="primary" onClick={() => { setStatus("all"); onClear(); }}>Clear filters</Button>}>
            The filters hide every case being prepared. Clear them to see all {active.length}.
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-3.5 p-5" aria-label={`${n} ${n === 1 ? "case" : "cases"} being prepared`}>
            {rows.map((d) => (
              <CaseRow key={d.id} draft={d} />
            ))}
          </ul>
        )}
      </Disclosure>
      {/* A link cannot sit inside the row's button, so it floats over the closed row, left of the chevron. */}
      <Link to={paths.authorizations()} className="absolute top-[26px] right-14 inline-flex items-center gap-1 rounded-md text-[13px] font-semibold text-forest hover:underline max-[900px]:hidden">
        Open in Authorizations<ArrowUpRight size={13} className="ico" aria-hidden="true" />
      </Link>
    </div>
  );
}
