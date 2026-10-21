import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen, Plus, Send, SearchX } from "lucide-react";
import { Button, Card, CardHeader, EmptyState, Segmented, type TabItem } from "@/components/ui";
import { draftState, needsPerson, type CaseDraft } from "@/data/cases";
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

/** The cases the agents are still preparing, at the top of Active cases. Search, level of care and payer come from the page filters. */
export function PreparingCard({ filters, onClear }: { filters: ManagerFilters; onClear: () => void }) {
  const nav = useNavigate();
  const drafts = useStore((s) => s.caseDrafts);
  const sentToday = useStore((s) => s.caseSentToday);
  const [status, setStatus] = useState<Status>("all");

  const active = useMemo(() => drafts.filter((d) => d.saved && !d.sent), [drafts]);
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

  return (
    <Card>
      <CardHeader
        title="Being prepared"
        subtitle="Most urgent first. Each case moves through eight steps; the agents do all but Ask and Sign."
        right={
          <div className="flex items-center gap-3">
            <Button size="sm" variant="ghost" icon={Send} onClick={() => nav(paths.dashboard({ stage: "received" }))}>
              {sentToday.length} sent today
            </Button>
            <Segmented items={items} value={status} onChange={setStatus} />
          </div>
        }
      />
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
    </Card>
  );
}
