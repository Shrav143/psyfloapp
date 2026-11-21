import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Inbox, SearchX, X } from "lucide-react";
import { ACTIVE_STATUSES, STATUS_TONE } from "@/data/assess/status";
import { Button, Card, EmptyState, Pill } from "@/components/ui";
import { TRIAGE_LABEL, TRIAGE_ORDER, type IntakeRecord, type TriageStatus } from "@/data/intake/types";
import { siteName } from "@/data/sites";
import { serviceById } from "@/data/va/services";
import { cn } from "@/lib/cn";
import { ago, shortDate, stamp } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { ACTIVE_CARDS, QUEUE_CARDS, type QueueCard } from "@/store/intakeSelectors";
import { useIntakeNow } from "../lib/policyNow";
import { activeFilterCount, filterRows } from "./facets";
import { FilterBar } from "./FilterBar";
import { FRAMEWORK_LABEL } from "./framework";
import { URGENCY_LABEL, URGENCY_TONE } from "./labels";
import { buildIntakeRows, defaultOrder, intakeFacets, searchTextOf, staffName, type IntakeRow } from "./rows";
import { SOURCE_LABEL } from "./sourceKind";
import { StatusCards } from "./StatusCards";
import { useListQuery } from "./useListQuery";
import { Worklist, type Column } from "./Worklist";

/** Tells the sidebar which Referrals & Intake page a record was opened from. */
export const FROM_QUEUE = { nav: "queue" } as const;
export const FROM_ACTIVE = { nav: "active" } as const;

type Scope = "queue" | "active";

/** The Referral Queue (every status) and Active Intakes (the four that follow the work): the status cards, the filters and the worklist. */
export function IntakeWorklist({ records, scope }: { records: IntakeRecord[]; scope: Scope }) {
  const now = useIntakeNow();
  const clock = useStore((s) => s.clock);
  const focus = useStore((s) => s.programFocus);
  const setFocus = useStore((s) => s.setProgramFocus);
  const statuses: readonly TriageStatus[] | undefined = scope === "active" ? ACTIVE_STATUSES : undefined;
  const defs = useMemo(() => intakeFacets(statuses), [statuses]);
  const { query, set, clear, params } = useListQuery(defs);

  const everyone = useMemo(() => buildIntakeRows(records, now), [records, now]);
  const universe = useMemo(() => (scope === "active" ? everyone.filter((r) => ACTIVE_STATUSES.includes(r.status)) : everyone), [everyone, scope]);
  const rows = useMemo(() => filterRows(universe, defs, query, searchTextOf), [universe, defs, query]);
  /* A card counts what it would show: the rows that pass the search and every filter but the status itself. */
  const cardBase = useMemo(() => filterRows(universe, defs, query, searchTextOf, "status"), [universe, defs, query]);
  const cardDefs: QueueCard[] = scope === "active" ? ACTIVE_CARDS : QUEUE_CARDS;
  const cards = cardDefs.map((c) => ({ id: c.id, label: c.label, line: c.line, count: cardBase.filter((r) => r.status === c.status).length }));
  const selected = cardDefs.find((c) => c.status === query.facets.status)?.id ?? null;
  const filtered = activeFilterCount(query) > 0;
  const resetKey = [...params.entries()].filter(([k]) => k !== "sort" && k !== "dir").join("&");

  return (
    <>
      <StatusCards
        label={scope === "active" ? "Active intake figures" : "Referral figures"}
        cards={cards}
        selected={selected}
        onSelect={(id) => set("status", id ? (cardDefs.find((c) => c.id === id)?.status ?? null) : null)}
      />
      <Card className="min-w-0">
        <div className="flex flex-col gap-3 border-b border-line px-5 py-4">
          <h2 className="text-[18px] leading-tight font-semibold">{scope === "active" ? "Active intakes" : "Referral worklist"}</h2>
          <FilterBar defs={defs} rows={universe} query={query} searchOf={searchTextOf} set={set} clear={clear} emptyShowsClear={rows.length === 0} />
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="text-muted" aria-live="polite">Showing {rows.length} of {universe.length}</span>
            {focus !== "all" ? (
              <button type="button" onClick={() => setFocus("all")} aria-label={`Remove program filter ${serviceById(focus).short}`} className="inline-flex items-center gap-1.5 rounded-full border border-forest bg-sage-bg px-2.5 py-0.5 text-forest">
                <span className="text-[12px] font-semibold">Program in the top bar: {serviceById(focus).short}</span>
                <X size={13} className="ico" />
              </button>
            ) : null}
          </div>
        </div>
        <Worklist
          key={resetKey}
          label={scope === "active" ? "Active intakes" : "Referral worklist"}
          rows={rows}
          columns={columns(clock, scope === "active" ? FROM_ACTIVE : FROM_QUEUE)}
          rowKey={(r) => r.id}
          rowHref={(r) => paths.intakeRecord(r.id)}
          linkState={scope === "active" ? FROM_ACTIVE : FROM_QUEUE}
          defaultOrder={defaultOrder}
          empty={
            <EmptyState
              icon={filtered ? SearchX : Inbox}
              title={filtered ? "No intakes match" : scope === "active" ? "No active intakes" : "No referrals yet"}
              action={filtered ? <Button onClick={clear}>Clear filters</Button> : focus !== "all" ? <Button onClick={() => setFocus("all")}>Show all programs</Button> : scope === "queue" ? <Link to={paths.createReferral()} className="inline-flex h-[38px] items-center rounded-xl bg-forest px-4 text-sm font-medium text-white hover:bg-forest-dark">New referral</Link> : undefined}
            >
              {filtered ? "Nothing in this view matches the search and filters." : focus !== "all" ? `Nothing for ${serviceById(focus).short} at the sites in view.` : scope === "active" ? "Intakes appear here once an assessment starts." : "Create a referral to start."}
            </EmptyState>
          }
        />
      </Card>
    </>
  );
}

/** Patient | Age | Referral Source | Program | Payer | Intake Status | Assessment | Assigned To | Next Action | Last Updated. */
function columns(clock: number, from: { nav: string }): Column<IntakeRow>[] {
  return [
    {
      id: "patient", label: "Patient", width: 150, sort: (r) => r.record.initials || "~",
      render: (r, href) => (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            <Link to={href} state={from} className="font-semibold underline decoration-1 underline-offset-[3px] hover:text-forest">{r.record.initials || "No name yet"}</Link>
          </div>
          <div className="mt-0.5 text-[12px] text-muted">{r.id} · {siteName(r.record.site)}</div>
          {r.safetyOpen || r.record.priority || r.record.urgency !== "routine" || r.duplicateOf ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {r.safetyOpen ? <Pill tone="risk" dot>Safety alert</Pill> : null}
              {r.record.urgency !== "routine" ? <Pill tone={URGENCY_TONE[r.record.urgency]}>{URGENCY_LABEL[r.record.urgency]}</Pill> : null}
              {r.record.priority ? <Pill tone="risk">Priority</Pill> : null}
              {r.duplicateOf ? <span title={`May be the same person as ${r.duplicateOf}. Open it to check before you create another intake.`}><Pill tone="mid">Possible duplicate</Pill></span> : null}
            </div>
          ) : null}
        </>
      ),
    },
    { id: "age", label: "Age", width: 52, sort: (r) => r.record.age ?? -1, render: (r) => (r.record.age !== null ? r.record.age : <span className="text-muted">None</span>) },
    {
      id: "source", label: "Referral Source", width: 132, sort: (r) => r.record.sourceOrg,
      render: (r) => (
        <>
          <div className="line-clamp-2" title={r.record.sourceOrg}>{r.record.sourceOrg}</div>
          <div className="mt-0.5 text-[12px] text-muted">{SOURCE_LABEL[r.source]} · {shortDate(r.record.createdAt)}</div>
        </>
      ),
    },
    {
      id: "program", label: "Program", width: 104, sort: (r) => r.program.label,
      render: (r) => (
        <>
          <div title={r.program.requested ? `Requested: ${r.program.requested}` : undefined}>{r.program.label}</div>
          {r.program.requested ? <div className="mt-0.5 text-[12px] text-muted">Requested: {r.program.requested}</div> : null}
          {r.cue ? <div className={cn("mt-0.5 text-[12px]", r.cue.tone === "mid" ? "text-mid-ink" : "text-muted")}>{r.cue.text}</div> : null}
        </>
      ),
    },
    { id: "payer", label: "Payer", width: 104, sort: (r) => r.payerName ?? "~", render: (r) => (r.payerName ? <div className="line-clamp-3" title={r.payerName}>{r.payerName}</div> : <span className="text-mid-ink">Plan not confirmed</span>) },
    {
      id: "status", label: "Intake Status", width: 128, sort: (r) => TRIAGE_ORDER.indexOf(r.status),
      render: (r) => <Pill tone={STATUS_TONE[r.status]} className="whitespace-normal! leading-tight">{TRIAGE_LABEL[r.status]}</Pill>,
    },
    {
      id: "assessment", label: "Assessment", width: 128, sort: (r) => (r.assessment.configured ? r.assessment.signed / Math.max(1, r.assessment.total) : -1),
      render: (r) => {
        const a = r.assessment;
        if (!a.configured) {
          return (
            <>
              <div className="text-mid-ink">Not configured</div>
              {a.legacy ? <div className="mt-0.5 text-[12px] text-muted">{a.legacy}</div> : null}
            </>
          );
        }
        return (
          <>
            <div className="font-medium">{a.frameworkKey === "none" ? "No framework" : FRAMEWORK_LABEL[a.frameworkKey]}</div>
            <div className="mt-0.5 text-[12px] text-muted">{a.signed} of {a.total} signed</div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-neutral-bg" aria-hidden="true"><div className="h-full rounded-full bg-forest" style={{ width: `${Math.round((a.signed / Math.max(1, a.total)) * 100)}%` }} /></div>
          </>
        );
      },
    },
    { id: "staff", label: "Assigned To", width: 88, sort: (r) => staffName(r.record.assignedTo), render: (r) => staffName(r.record.assignedTo) },
    {
      id: "next", label: "Next Action", width: 140, sort: (r) => r.next.label,
      render: (r) => (
        <Link
          to={r.next.to}
          state={from}
          data-next={r.id}
          className={cn("inline-flex items-start gap-1 text-left font-semibold hover:underline", r.next.done ? "font-medium text-muted" : r.next.tone === "risk" ? "text-risk-ink" : "text-forest")}
        >
          <span>{r.next.label}</span>
          {r.next.done ? null : <ArrowRight size={14} className="ico mt-[3px] shrink-0" />}
        </Link>
      ),
    },
    { id: "updated", label: "Last Updated", width: 76, sort: (r) => r.updatedAt, render: (r) => <span title={stamp(r.updatedAt)} className="text-muted">{ago(r.updatedAt, clock)}</span> },
  ];
}
