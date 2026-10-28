import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck, SearchX } from "lucide-react";
import { Button, Card, EmptyState, Pill } from "@/components/ui";
import { INSTRUMENT_STATUS_LABEL, LEVEL_LABEL, type InstrumentStatus } from "@/data/assess/types";
import type { IntakeRecord } from "@/data/intake/types";
import type { Tone } from "@/data/types";
import { siteName } from "@/data/sites";
import { ago, stamp } from "@/lib/time";
import { useStore } from "@/store";
import { useIntakeNow } from "../lib/policyNow";
import { ASSESSMENT_STATUS_ORDER, assessmentFacets, assessmentOrder, assessmentSearchText, buildAssessmentRows, type AssessmentRow } from "./assessmentsModel";
import { activeFilterCount, filterRows } from "./facets";
import { FilterBar } from "./FilterBar";
import { FRAMEWORK_LABEL } from "./framework";
import { programOf } from "./programKey";
import { staffName } from "./rows";
import { StatusCards } from "./StatusCards";
import { useListQuery } from "./useListQuery";
import { Worklist, type Column } from "./Worklist";

export const FROM_ASSESSMENTS = { nav: "assessments" } as const;

const TONE: Record<InstrumentStatus, Tone> = { not_started: "neutral", in_progress: "neutral", awaiting_review: "mid", signed: "good", superseded: "neutral" };
const CARDS: { id: InstrumentStatus; label: string; line: string }[] = [
  { id: "awaiting_review", label: "Awaiting review", line: "Waiting for a clinician" },
  { id: "in_progress", label: "In progress", line: "Started, not complete" },
  { id: "not_started", label: "Not started", line: "In use, nobody has begun" },
  { id: "signed", label: "Signed", line: "Signed by a clinician" },
];

/** Every assessment across the intakes, one row each: who holds it, its status and version. A row opens that module in the intake's workspace. */
export function AssessmentsWorklist({ records }: { records: IntakeRecord[] }) {
  const now = useIntakeNow();
  const clock = useStore((s) => s.clock);
  const defs = useMemo(() => assessmentFacets(), []);
  const { query, set, clear, params } = useListQuery(defs);
  const all = useMemo(() => buildAssessmentRows(records, now), [records, now]);
  const rows = useMemo(() => filterRows(all, defs, query, assessmentSearchText), [all, defs, query]);
  const base = useMemo(() => filterRows(all, defs, query, assessmentSearchText, "status"), [all, defs, query]);
  const cards = CARDS.map((c) => ({ ...c, count: base.filter((r) => r.status === c.id).length }));
  const filtered = activeFilterCount(query) > 0;
  const resetKey = [...params.entries()].filter(([k]) => k !== "sort" && k !== "dir").join("&");

  return (
    <>
      <StatusCards label="Assessment figures" cards={cards} selected={CARDS.find((c) => c.id === query.facets.status)?.id ?? null} onSelect={(id) => set("status", id)} />
      <Card className="min-w-0">
        <div className="flex flex-col gap-3 border-b border-line px-5 py-4">
          <h2 className="text-[18px] leading-tight font-semibold">Assessments</h2>
          <FilterBar defs={defs} rows={all} query={query} searchOf={assessmentSearchText} set={set} clear={clear} emptyShowsClear={rows.length === 0} />
          <span className="text-[13px] text-muted" aria-live="polite">Showing {rows.length} of {all.length}</span>
        </div>
        <Worklist
          key={resetKey}
          label="Assessments"
          rows={rows}
          columns={columns(clock)}
          rowKey={(r) => r.key}
          rowHref={(r) => r.to}
          linkState={FROM_ASSESSMENTS}
          defaultOrder={assessmentOrder}
          empty={
            <EmptyState icon={filtered ? SearchX : ClipboardCheck} title={filtered ? "No assessments match" : "No assessments yet"} action={filtered ? <Button onClick={clear}>Clear filters</Button> : undefined}>
              {filtered ? "Nothing in this view matches the search and filters." : "Assessments appear here once an intake is configured."}
            </EmptyState>
          }
        />
      </Card>
    </>
  );
}

function columns(clock: number): Column<AssessmentRow>[] {
  return [
    {
      id: "patient", label: "Patient", width: 150, sort: (r) => r.record.initials || "~",
      render: (r, href) => (
        <>
          <Link to={href} state={FROM_ASSESSMENTS} className="font-semibold underline decoration-1 underline-offset-[3px] hover:text-forest">{r.record.initials || "No name yet"}{r.record.age !== null ? `, ${r.record.age}` : ""}</Link>
          <div className="mt-0.5 text-[12px] text-muted">{r.record.id} · {siteName(r.record.site)}</div>
        </>
      ),
    },
    {
      id: "assessment", label: "Assessment", width: 220, sort: (r) => r.label,
      render: (r) => (
        <>
          <div className="font-medium">{r.label}</div>
          <div className="mt-0.5 text-[12px] text-muted">{r.kind}{r.level ? ` · ${LEVEL_LABEL[r.level]}` : ""}</div>
        </>
      ),
    },
    { id: "program", label: "Program", width: 120, sort: (r) => programOf(r.record).label, render: (r) => programOf(r.record).label },
    { id: "framework", label: "Framework", width: 120, sort: (r) => FRAMEWORK_LABEL[r.frameworkKey], render: (r) => (r.frameworkKey === "unconfigured" ? <span className="text-mid-ink">Not configured</span> : r.frameworkKey === "none" ? "No framework" : FRAMEWORK_LABEL[r.frameworkKey]) },
    {
      id: "status", label: "Status", width: 140, sort: (r) => ASSESSMENT_STATUS_ORDER.indexOf(r.status),
      render: (r) => (
        <>
          <Pill tone={TONE[r.status]}>{INSTRUMENT_STATUS_LABEL[r.status]}</Pill>
          {r.status === "in_progress" && r.percent !== null ? <div className="mt-1 text-[12px] text-muted">{r.percent}% of required fields</div> : null}
        </>
      ),
    },
    { id: "staff", label: "Assigned To", width: 110, sort: (r) => staffName(r.assignee), render: (r) => staffName(r.assignee) },
    { id: "version", label: "Version", width: 70, sort: (r) => r.version, render: (r) => `v${r.version}` },
    { id: "updated", label: "Last Updated", width: 100, sort: (r) => r.updatedAt ?? -1, render: (r) => (r.updatedAt === null ? <span className="text-muted">Not started</span> : <span title={stamp(r.updatedAt)} className="text-muted">{ago(r.updatedAt, clock)}</span>) },
  ];
}
