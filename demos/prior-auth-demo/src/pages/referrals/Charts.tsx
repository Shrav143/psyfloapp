import { Funnel, Card, CardBody, CardHeader, Columns, EmptyState } from "@/components/ui";
import { SOURCE_KIND_LABEL } from "@/data/referrals";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { SourceStat } from "./metrics";
import type { ReferralFilters } from "@/store/referrals";

export function FunnelCard({ steps }: { steps: { label: string; value: number }[] }) {
  const complete = steps.every((s) => s.value > 0);
  return (
    <Card>
      <CardHeader title="Referral funnel" subtitle="Received to admitted, with the rate at each step" />
      <CardBody>
        {complete ? (
          <>
            <Funnel steps={steps} />
            <p className="mt-5 text-[13px] text-muted">Reviewed means a person has looked at it. Accepted includes referrals with an intake booked and those already admitted.</p>
          </>
        ) : (
          <EmptyState icon={BarChart3} title="No full funnel yet">{steps.map((s) => `${s.label} ${s.value}`).join(" · ")}. The funnel draws once a referral reaches every step.</EmptyState>
        )}
      </CardBody>
    </Card>
  );
}

/** Bars by where the referral came from. Clicking one filters the whole page to that source. */
export function SourceCard({ stats, selected, onPick }: { stats: SourceStat[]; selected: ReferralFilters["source"]; onPick: (k: ReferralFilters["source"]) => void }) {
  const max = Math.max(1, ...stats.map((s) => s.count));
  return (
    <Card>
      <CardHeader title="Where referrals come from" subtitle="Count and the share that became admissions. Click a bar to filter" />
      <CardBody>
        {stats.length ? (
          <ul className="flex flex-col gap-1.5">
            {stats.map((s) => {
              const on = selected === s.kind;
              return (
                <li key={s.kind}>
                  <button type="button" onClick={() => onPick(on ? "all" : s.kind)} aria-pressed={on} className={cn("flex w-full items-center gap-3 rounded-lg px-1.5 py-1 text-left hover:bg-tile", on && "bg-[#F3F7F4] font-semibold")}>
                    <span className="w-[150px] shrink-0 truncate text-[13px]">{SOURCE_KIND_LABEL[s.kind]}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#F0ECE4]">
                      <i className="block h-full rounded-full" style={{ width: `${(s.count / max) * 100}%`, background: on ? "#1D4F43" : "#2F6F5C" }} />
                    </span>
                    <span className="w-[62px] shrink-0 text-right text-[13px]">
                      <b>{s.count}</b> <span className="text-muted">· {Math.round((s.admitted / s.count) * 100)}%</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={BarChart3} title="No referrals match" />
        )}
      </CardBody>
    </Card>
  );
}

export function WeeklyCard({ data }: { data: { label: string; value: number }[] }) {
  return (
    <Card className="col-span-2 min-[1400px]:col-span-1">
      <CardHeader title="Received per week" subtitle="Last 8 weeks, each starting on the date shown. This week is dark" />
      <CardBody>
        <Columns data={data} height={168} highlight={data[data.length - 1]?.label} />
      </CardBody>
    </Card>
  );
}
