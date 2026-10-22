import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Clock, Wrench } from "lucide-react";
import { Stat } from "@/components/ui";
import { InfoTip } from "./InfoTip";
import { NOT_ENOUGH } from "./copy";
import { daysTrend, fmt, trendLine, type View } from "./model";

/** Two small lines under a tile's number: the point of it, and what it rests on. */
function sub(hidden: boolean, first: ReactNode, second: ReactNode): ReactNode {
  return (
    <>
      <div>{hidden ? NOT_ENOUGH : first}</div>
      <div className="mt-0.5 text-[11.5px] opacity-75">{hidden ? "" : second}</div>
    </>
  );
}
const percent = (v: number | null): string => (v === null ? "-" : `${v}%`);

/** The four figures at the top, all summed from the same model as the charts: approval rate, denial rate, turnaround, preventable denials. */
export function KeyFigures({ v }: { v: View }) {
  const prev = v.period.prev;
  const phrase = v.period.phrase;
  const { approved, denial, turnaround, preventable } = v;
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <div className="relative flex" data-testid="figure-approval">
        <Stat
          className="w-full"
          tone="good"
          icon={CheckCircle2}
          value={percent(approved.value)}
          label="Approval rate"
          sub={sub(approved.value === null, trendLine(approved.delta, prev), `${fmt(approved.n)} decisions · ${phrase}`)}
        />
        <InfoTip label="About the approval rate">Share of decisions where the payer approved what was asked. Modeled from the quarter's decisions for the period, payer and program you pick.</InfoTip>
      </div>
      <div className="relative flex" data-testid="figure-denial">
        <Stat
          className="w-full"
          tone="risk"
          icon={AlertTriangle}
          value={percent(denial.value)}
          label="Denial rate"
          sub={sub(denial.value === null, `${fmt(denial.denials)} denials · ${fmt(v.accepted.n)} accepted`, trendLine(denial.delta, prev))}
        />
        <InfoTip label="About the denial rate">Share of decisions that were denied or cut back. It is 100 minus the approval rate. Accepted denials include the ones you accept in Denial Intelligence.</InfoTip>
      </div>
      <div className="relative flex" data-testid="figure-turnaround">
        <Stat
          className="w-full"
          tone="neutral"
          icon={Clock}
          value={
            turnaround.days === null ? (
              "-"
            ) : (
              <>
                {turnaround.days.toFixed(1)}
                <span className="ml-1 text-base font-medium">days</span>
              </>
            )
          }
          label="Turnaround"
          sub={sub(turnaround.days === null, `Sent to decision · typical ${turnaround.typical.toFixed(1)} days`, daysTrend(turnaround.delta, prev))}
        />
        <InfoTip label="About turnaround">Average days from sent to decision, weighted by each payer's decisions. Demo values: the payer averages are sample data, and the other periods and programs are scaled from them.</InfoTip>
      </div>
      <div className="relative flex" data-testid="figure-preventable">
        <Stat
          className="w-full"
          tone="mid"
          icon={Wrench}
          value={preventable.count === null ? "-" : fmt(preventable.count)}
          label="Preventable denials"
          sub={sub(preventable.count === null, `${preventable.share}% of ${fmt(preventable.n)} denials`, "Fixable before sending")}
        />
        <InfoTip label="About preventable denials">Denials whose reason the team can fix before sending: thin or missing documentation, late notice, an incomplete certification, a duplicate request. Counted from the reasons in the chart below.</InfoTip>
      </div>
    </div>
  );
}
