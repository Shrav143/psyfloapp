import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SearchX } from "lucide-react";
import { Button, Card, CardHeader, Chip, EmptyState, IdLink, Pill, Stat } from "@/components/ui";
import { inWeek, isClean, type Review } from "@/data/managerReviews";
import { PROGRAM_LABEL } from "@/data/types";
import { plural } from "@/lib/format";
import { clockTime, toDate } from "@/lib/time";
import { PAYER_ROW_LABEL } from "@/pages/dashboard/helpers";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { REVIEW_STATUS_LABEL, REVIEW_STATUS_TONE, groupByDay, matchesBase, type ManagerFilters } from "./helpers";

const PER_DAY = 5;

/** Cases the team may want to look at for a lower level of care. A prompt, never a decision. R-0873 is a tracker case and P-1522 is in the queue, so both open. */
const STEP_DOWN = [
  { id: "R-0873", head: "Day 18 of 21", note: "Aftercare visit not booked yet" },
  { id: "P-1522", head: "Day 11", note: "IOP starts Monday" },
];

function ReviewRow({ r, onOpen }: { r: Review; onOpen: (id: string) => void }) {
  const warn = r.status === "drafted" && !isClean(r);
  return (
    <div className="flex items-center gap-3 border-b border-line px-6 py-3 last:border-b-0">
      <span className="w-[72px] shrink-0 text-muted">{clockTime(toDate(r.dueAt))}</span>
      <div className="w-[130px] shrink-0">
        <Chip>{PROGRAM_LABEL[r.program]}</Chip>
      </div>
      <div className="min-w-0 flex-1">
        <IdLink onClick={() => onOpen(r.id)}>{r.ledgerId}</IdLink>
        <span className="text-muted"> · {PAYER_ROW_LABEL[r.payerId]} · {r.initials}, {r.age}</span>
        {r.status === "needs_update" ? <div className="truncate text-[13px] text-mid-ink">{r.missing}</div> : null}
      </div>
      {warn ? <Pill tone="mid">Check to look at</Pill> : null}
      <Pill tone={REVIEW_STATUS_TONE[r.status]}>{REVIEW_STATUS_LABEL[r.status]}</Pill>
      <Button size="sm" aria-label={`Open review ${r.ledgerId}`} onClick={() => onOpen(r.id)}>
        Open
      </Button>
    </div>
  );
}

/** A week of continued-stay reviews, mostly already written. */
export function ReviewsView({ filters, onOpen, onClear }: { filters: ManagerFilters; onOpen: (id: string) => void; onClear: () => void }) {
  const all = useStore((s) => s.reviews);
  const clock = useStore((s) => s.clock);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // A next review booked for after this week is not on the list; the case row and the signed review show its date.
  const reviews = useMemo(() => all.filter(inWeek), [all]);
  const total = reviews.length;
  const signed = reviews.filter((r) => r.status === "signed").length;
  const needs = reviews.filter((r) => r.status === "needs_update").length;
  const waiting = reviews.filter((r) => r.status === "due").length;
  const clean = reviews.filter(isClean).length;
  const shown = useMemo(() => reviews.filter((r) => matchesBase({ id: r.ledgerId, initials: r.initials, program: r.program, payerId: r.payerId }, filters) && (filters.reviewStatus === "all" || r.status === filters.reviewStatus)), [reviews, filters]);
  const days = useMemo(() => groupByDay(shown, clock), [shown, clock]);

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <Stat tone="neutral" value={total} label="Reviews due this week" sub={`${signed} signed so far${waiting ? `, ${waiting} not drafted yet` : ""}`} />
        <Stat tone="good" value={total - needs - waiting} label="Drafted by agents" sub={`${clean} clean, ready to sign`} />
        <Stat tone="mid" value={needs} label="Need a clinician update" sub={needs ? "what is missing is listed" : "nothing waiting on you"} />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-5">
        <div className="flex flex-col gap-4">
          {shown.length !== total ? <p className="text-sm text-muted" aria-live="polite">Showing {shown.length} of {plural(total, "review")}. The tiles count {total === 1 ? "it" : `all ${total}`}.</p> : null}
          {days.length === 0 ? (
            <Card>
              <EmptyState icon={SearchX} title="No reviews match" action={<Button onClick={onClear}>Clear filters</Button>}>
                The filters hide every review this week.
              </EmptyState>
            </Card>
          ) : (
            days.map((g) => {
              const open = expanded[g.key];
              const rows = open ? g.reviews : g.reviews.slice(0, PER_DAY);
              return (
                <Card key={g.key} className="overflow-hidden" data-day={g.label}>
                  <CardHeader title={g.label} subtitle={g.date} right={<span className="text-muted">{plural(g.reviews.length, "review")}</span>} />
                  {rows.map((r) => (
                    <ReviewRow key={r.id} r={r} onOpen={onOpen} />
                  ))}
                  {g.reviews.length > PER_DAY ? (
                    <div className="flex justify-center border-t border-line py-2.5">
                      <Button variant="ghost" size="sm" onClick={() => setExpanded((e) => ({ ...e, [g.key]: !open }))}>
                        {open ? "Show fewer" : `Show ${g.reviews.length - PER_DAY} more`}
                      </Button>
                    </div>
                  ) : null}
                </Card>
              );
            })
          )}
        </div>
        <Card>
          <CardHeader title="Ready to step down?" subtitle="A prompt for your team. It is never a decision." />
          {STEP_DOWN.map((s) => (
            <Link key={s.id} to={paths.case(s.id)} className="block border-b border-line px-6 py-3.5 last:border-b-0 hover:bg-[#FBF8F3]">
              <div>
                <span className="font-semibold underline decoration-1 underline-offset-[3px]">{s.id}</span> <span className="text-muted">· {s.head}</span>
              </div>
              <div className="text-sm text-muted">{s.note}</div>
            </Link>
          ))}
        </Card>
      </div>
    </>
  );
}
