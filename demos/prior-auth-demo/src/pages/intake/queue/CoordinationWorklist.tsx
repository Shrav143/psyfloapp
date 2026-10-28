import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCheck, SearchX, Share2, Sparkles } from "lucide-react";
import { Button, Card, EmptyState, Pill } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import { siteName } from "@/data/sites";
import { cn } from "@/lib/cn";
import { ago, stamp } from "@/lib/time";
import { useStore } from "@/store";
import { useIntakeNow } from "../lib/policyNow";
import { draftFollowUp } from "../pathway/referral/referralAgents";
import { buildCoordinationRows, coordinationFacets, coordinationOrder, coordinationSearchText, dueLabel, KIND_LABEL, VIEW_CARDS, type CoordRow } from "./coordinationModel";
import { activeFilterCount, filterRows } from "./facets";
import { FilterBar } from "./FilterBar";
import { staffName } from "./rows";
import { StatusCards } from "./StatusCards";
import { useListQuery } from "./useListQuery";
import { Worklist, type Column } from "./Worklist";

export const FROM_COORDINATION = { nav: "coordination" } as const;

/** Care Coordination: referrals out, replies we are waiting on, closed-loop reminders and the intakes ready for care planning or authorization.
    Each row has the action that moves it: open it, record the referrer's reply, or have the Referral Coordination Agent draft a follow-up (a person sends it). */
export function CoordinationWorklist({ records }: { records: IntakeRecord[] }) {
  const clock = useStore((s) => s.clock);
  const now = useIntakeNow();
  const defs = useMemo(() => coordinationFacets(), []);
  const { query, set, clear, params } = useListQuery(defs);
  const all = useMemo(() => buildCoordinationRows(records, clock, now), [records, clock, now]);
  const rows = useMemo(() => filterRows(all, defs, query, coordinationSearchText), [all, defs, query]);
  const base = useMemo(() => filterRows(all, defs, query, coordinationSearchText, "view"), [all, defs, query]);
  const cards = VIEW_CARDS.map((c) => ({ ...c, count: base.filter((r) => r.views.includes(c.id)).length }));
  const filtered = activeFilterCount(query) > 0;
  const resetKey = [...params.entries()].filter(([k]) => k !== "sort" && k !== "dir").join("&");

  return (
    <>
      <StatusCards label="Care coordination figures" cards={cards} selected={VIEW_CARDS.find((c) => c.id === query.facets.view)?.id ?? null} onSelect={(id) => set("view", id)} />
      <Card className="min-w-0 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line px-5 py-4">
          <h2 className="text-[18px] leading-tight font-semibold">Coordination worklist</h2>
          <FilterBar defs={defs} rows={all} query={query} searchOf={coordinationSearchText} set={set} clear={clear} hide={["view"]} />
          <span className="text-[13px] text-muted" aria-live="polite">Showing {rows.length} of {all.length}</span>
        </div>
        <Worklist
          key={resetKey}
          label="Care coordination"
          rows={rows}
          columns={columns(clock)}
          rowKey={(r) => r.key}
          rowHref={(r) => r.to}
          linkState={FROM_COORDINATION}
          defaultOrder={coordinationOrder}
          empty={
            <EmptyState icon={filtered ? SearchX : Share2} title={filtered ? "Nothing matches" : "Nothing to coordinate"} action={filtered ? <Button onClick={clear}>Clear filters</Button> : undefined}>
              {filtered ? "Nothing in this view matches the search and filters." : "Referrals out, replies we wait on and intakes ready for care planning appear here."}
            </EmptyState>
          }
        />
      </Card>
    </>
  );
}

function Actions({ row }: { row: CoordRow }) {
  const toast = useStore((s) => s.toast);
  const markReply = useStore((s) => s.markIntakeInfoReply);
  const waiting = row.ro && ["sent", "received", "under_review"].includes(row.ro.status);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {row.kind === "reply" && row.taskId ? (
        <Button size="sm" icon={CheckCheck} onClick={() => { markReply(row.record.id, row.taskId as string); toast({ title: "Reply recorded", body: `${row.record.initials}: the referrer's reply is in the audit trail. Add what they sent in the Referral section.`, tone: "good" }); }}>Record reply</Button>
      ) : null}
      {waiting && row.ro && !row.hasDraft ? (
        <Button size="sm" icon={Sparkles} onClick={() => { draftFollowUp(row.record.id, row.ro?.id ?? ""); toast({ title: "Follow-up requested", body: "The Referral Coordination Agent drafts it. A person reviews and sends it from the intake.", tone: "neutral" }); }}>Draft follow-up</Button>
      ) : null}
      <Link to={row.to} state={FROM_COORDINATION} className="inline-flex h-8 items-center gap-1 rounded-[10px] px-2 font-semibold text-forest hover:bg-sage-bg">
        <span className="text-[13px]">{row.hasDraft ? "Review draft" : "Open"}</span>
        <ArrowRight size={14} className="ico" aria-hidden="true" />
      </Link>
    </div>
  );
}

function columns(clock: number): Column<CoordRow>[] {
  return [
    {
      id: "patient", label: "Patient", width: 150, sort: (r) => r.record.initials || "~",
      render: (r, href) => (
        <>
          <Link to={href} state={FROM_COORDINATION} className="font-semibold underline decoration-1 underline-offset-[3px] hover:text-forest">{r.record.initials || "No name yet"}{r.record.age !== null ? `, ${r.record.age}` : ""}</Link>
          <div className="mt-0.5 text-[12px] text-muted">{r.record.id} · {siteName(r.record.site)}</div>
        </>
      ),
    },
    {
      id: "item", label: "Item", width: 200, sort: (r) => r.title,
      render: (r) => (
        <>
          <div className="font-medium">{r.title}</div>
          <div className="mt-0.5 text-[12px] text-muted">{KIND_LABEL[r.kind]} · {r.serviceLabel}</div>
          {r.counterparty && r.kind !== "reply" ? <div className="text-[12px] text-muted">{r.counterparty}</div> : null}
        </>
      ),
    },
    { id: "status", label: "Status", width: 124, sort: (r) => r.status, render: (r) => <Pill tone={r.statusTone} className="whitespace-normal! leading-tight">{r.status}</Pill> },
    { id: "step", label: "Next Step", width: 150, sort: (r) => r.step, render: (r) => r.step },
    {
      id: "due", label: "Due", width: 96, sort: (r) => r.due ?? Number.MAX_SAFE_INTEGER,
      render: (r) => (
        <>
          <div className={cn(r.due === null && "text-muted")}>{dueLabel(r.due)}</div>
          {r.overdue ? <div className="mt-1"><Pill tone="risk">Overdue</Pill></div> : null}
        </>
      ),
    },
    { id: "staff", label: "Assigned To", width: 96, sort: (r) => staffName(r.record.assignedTo), render: (r) => staffName(r.record.assignedTo) },
    { id: "updated", label: "Last Updated", width: 80, sort: (r) => r.updatedAt, render: (r) => <span title={stamp(r.updatedAt)} className="text-muted">{ago(r.updatedAt, clock)}</span> },
    { id: "actions", label: "Actions", width: 220, hideLabel: true, render: (r) => <Actions row={r} /> },
  ];
}
