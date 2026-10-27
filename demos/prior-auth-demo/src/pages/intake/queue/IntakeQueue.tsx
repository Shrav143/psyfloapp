import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Inbox, SearchX, X } from "lucide-react";
import { Button, Card, EmptyState } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import { serviceById } from "@/data/va/services";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { selectReferralBadge } from "@/store/referrals";
import { useIntakeNow } from "../lib/policyNow";
import { activeCount, matches, QUEUE_PARAMS, readQuery, sortQueue } from "./filters";
import { metricById } from "./metrics";
import { NewIntakeButton } from "./NewIntakeButton";
import { QueueFilterBar } from "./QueueFilterBar";
import { QueueTable } from "./QueueTable";

/** The searchable queue of referrals and intakes. `records` is already narrowed to the sites in view and the top-bar Program. */
export function IntakeQueue({ records }: { records: IntakeRecord[] }) {
  const [params, setParams] = useSearchParams();
  const now = useIntakeNow();
  const clock = useStore((s) => s.clock);
  const focus = useStore((s) => s.programFocus);
  const setFocus = useStore((s) => s.setProgramFocus);
  const inbox = useStore(selectReferralBadge);
  const query = useMemo(() => readQuery(params), [params]);
  const rows = useMemo(() => sortQueue(records.filter((r) => matches(r, query, now, clock))), [records, query, now, clock]);
  const metric = metricById(query.metric);

  const setParam = (key: string, value: string | null, replace = false) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (value) n.set(key, value);
        else n.delete(key);
        return n;
      },
      { replace },
    );
  const clear = () =>
    setParams((p) => {
      const n = new URLSearchParams(p);
      for (const k of QUEUE_PARAMS) n.delete(k);
      return n;
    });
  const filtered = activeCount(query) > 0;

  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-[18px] font-semibold leading-tight">Referrals and intakes</h2>
          {inbox > 0 ? (
            <Link to={paths.newCase()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-forest hover:underline">
              <Inbox size={15} className="ico" />
              {inbox} referral{inbox === 1 ? "" : "s"} in the New Case inbox
            </Link>
          ) : null}
        </div>
        <QueueFilterBar records={records} query={query} now={now} clock={clock} setParam={setParam} />
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-muted" aria-live="polite">Showing {rows.length} of {records.length}</span>
          {focus !== "all" ? (
            <button type="button" onClick={() => setFocus("all")} aria-label={`Remove program filter ${serviceById(focus).short}`} className="inline-flex items-center gap-1.5 rounded-full border border-forest bg-sage-bg px-2.5 py-0.5 text-[12px] font-semibold text-forest">
              Program: {serviceById(focus).short}
              <X size={13} className="ico" />
            </button>
          ) : null}
          {metric ? (
            <button type="button" onClick={() => setParam("metric", null)} aria-label={`Remove figure filter ${metric.label}`} className="inline-flex items-center gap-1.5 rounded-full border border-forest bg-sage-bg px-2.5 py-0.5 text-[12px] font-semibold text-forest">
              {metric.label}
              <X size={13} className="ico" />
            </button>
          ) : null}
          {filtered ? <Button size="sm" variant="ghost" onClick={clear}>Clear filters</Button> : null}
        </div>
      </div>
      {rows.length ? (
        <QueueTable rows={rows} now={now} />
      ) : (
        <EmptyState
          icon={SearchX}
          title="No intakes match"
          action={filtered ? <Button onClick={clear}>Clear filters</Button> : focus !== "all" ? <Button onClick={() => setFocus("all")}>Show all programs</Button> : <NewIntakeButton />}
        >
          {filtered ? "Nothing in this view matches the search and filters." : focus !== "all" ? `No intakes for ${serviceById(focus).short} at the sites in view.` : "No intakes at the sites in view."}
        </EmptyState>
      )}
    </Card>
  );
}
