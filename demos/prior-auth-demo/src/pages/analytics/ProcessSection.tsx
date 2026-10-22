import { CHART, ColumnChart, StackedHBars, TrendChart } from "@/components/ui";
import { MONTHS } from "@/data/decisions";
import { Meter } from "@/components/ui";
import type { Board } from "./board";
import type { CaseQuery } from "./query";
import { fmt, pctOf } from "./stats";

export interface Workload {
  handled: number;
  open: number;
  needsYou: number;
}

/** Process health: retro-authorizations by month (a sign of missed authorizations), days from referral to authorization, decisions by month (workload), and how peer-to-peer calls and appeals ended. */
export function ProcessSection({ board, workload, scopeWords, onOpen }: { board: Board; workload: Workload; scopeWords: string; onOpen: (q: CaseQuery) => void }) {
  const p = board.process;
  const total = workload.handled + workload.open;
  const retroOpen = (i: number) => onOpen({ month: i, kind: "retro", title: `Retrospective requests in ${MONTHS[i].long}`, note: "Requests made after care began. A high number can mean authorizations were missed." });
  const refValues = p.referral.map((r) => r.avg);
  return (
    <div className="flex flex-col gap-8 px-6 py-5" data-testid="process">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h4 className="text-[15px] font-semibold">Retro-authorizations by month</h4>
          <p className="mb-2 text-[13px] text-muted">Requests made after care began, a sign that an authorization was missed. Click a month for its cases.</p>
          <ColumnChart
            ariaLabel="Retrospective requests by month"
            labels={MONTHS.map((m) => m.label)}
            details={MONTHS.map((m) => m.range)}
            height={190}
            format={(v) => fmt(Math.round(v))}
            onColumn={retroOpen}
            extra={(i) => `${p.retroShare[i] === null ? "-" : `${p.retroShare[i]}%`} of the month's decisions`}
            series={[{ key: "retro", name: "Retrospective requests", color: CHART.mid, values: p.retroCount }]}
            summary={`Retrospective requests by month: ${p.retroCount.map((n, i) => `${MONTHS[i].label} ${n}`).join(", ")}.`}
            table={{ caption: "Retrospective requests by month", head: ["Month", "Retrospective requests", "Share of decisions"], rows: MONTHS.map((m, i) => [m.range, p.retroCount[i], p.retroShare[i] === null ? "-" : `${p.retroShare[i]}%`]) }}
          />
        </div>
        <div>
          <h4 className="text-[15px] font-semibold">Referral to authorization</h4>
          <p className="mb-2 text-[13px] text-muted">Average days from referral to the payer's decision on first requests.</p>
          <TrendChart
            ariaLabel="Days from referral to authorization, by month"
            labels={MONTHS.map((m) => m.label)}
            details={MONTHS.map((m) => m.range)}
            height={190}
            format={(v) => v.toFixed(1)}
            extra={(i) => `${p.referral[i].n} first requests`}
            series={[{ key: "days", name: "Days, referral to authorization", color: CHART.forest, values: refValues, area: true }]}
            summary={`Days from referral to authorization went from ${refValues[0] ?? "-"} in ${MONTHS[0].label} to ${refValues[11] ?? "-"} in ${MONTHS[11].label}.`}
            table={{ caption: "Referral to authorization", head: ["Month", "Average days", "First requests"], rows: MONTHS.map((m, i) => [m.range, refValues[i] ?? "-", p.referral[i].n]) }}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h4 className="text-[15px] font-semibold">Workload: decisions by month</h4>
          <p className="mb-2 text-[13px] text-muted">How many requests the payers decided each month, by outcome.</p>
          <ColumnChart
            ariaLabel="Decisions by month and outcome"
            labels={MONTHS.map((m) => m.label)}
            details={MONTHS.map((m) => m.range)}
            height={190}
            stacked
            format={(v) => fmt(Math.round(v))}
            onColumn={(i) => onOpen({ month: i, title: `Decisions in ${MONTHS[i].long}`, note: `Every decision from ${MONTHS[i].range}.` })}
            series={[
              { key: "approved", name: "Approved as requested", color: CHART.good, values: p.months.map((m) => m.s.approved) },
              { key: "partial", name: "Approved in part", color: CHART.mid, values: p.months.map((m) => m.s.partial) },
              { key: "denied", name: "Denied", color: CHART.risk, values: p.months.map((m) => m.s.denied) },
            ]}
            summary={`Decisions by month: ${p.months.map((m) => `${m.month.label} ${m.s.n}`).join(", ")}.`}
            table={{ caption: "Decisions by month", head: ["Month", "Decisions", "Approved as requested", "Approved in part", "Denied"], rows: p.months.map((m) => [m.month.range, m.s.n, m.s.approved, m.s.partial, m.s.denied]) }}
          />
        </div>
        <div>
          <h4 className="text-[15px] font-semibold">Peer-to-peer calls and appeals</h4>
          <p className="mb-2 text-[13px] text-muted">How the {fmt(p.denials)} denials in the period were challenged and what came of it.</p>
          <StackedHBars
            ariaLabel="Peer-to-peer calls and appeals"
            labelWidth={150}
            legend={[
              { key: "changed", label: "Overturned or changed", color: CHART.good },
              { key: "partly", label: "Partly restored", color: CHART.sage },
              { key: "stood", label: "Upheld or stood", color: CHART.umber },
              { key: "open", label: "Open", color: CHART.midSoft },
            ]}
            rows={[
              { key: "p2p", label: "Peer-to-peer calls", total: p.calls.changed + p.calls.stood + p.calls.scheduled, segments: [{ key: "changed", label: "The reviewer changed the decision", value: p.calls.changed, color: CHART.good }, { key: "stood", label: "The decision stood", value: p.calls.stood, color: CHART.umber }, { key: "open", label: "Booked, not held yet", value: p.calls.scheduled, color: CHART.midSoft }] },
              { key: "appeals", label: "Appeals", total: p.appeals.overturned + p.appeals.partly + p.appeals.upheld + p.appeals.pending, segments: [{ key: "changed", label: "Overturned", value: p.appeals.overturned, color: CHART.good }, { key: "partly", label: "Partly restored", value: p.appeals.partly, color: CHART.sage }, { key: "stood", label: "Upheld", value: p.appeals.upheld, color: CHART.umber }, { key: "open", label: "Filed, no ruling yet", value: p.appeals.pending, color: CHART.midSoft }] },
            ]}
            summary={`Peer-to-peer calls: ${p.calls.changed} changed the decision, ${p.calls.stood} did not. Appeals: ${p.appeals.overturned} overturned, ${p.appeals.partly} partly restored, ${p.appeals.upheld} upheld, ${p.appeals.pending} open.`}
            table={{ caption: "Peer-to-peer calls and appeals", head: ["Step", "Changed or overturned", "Partly restored", "Stood or upheld", "Open"], rows: [["Peer-to-peer calls", p.calls.changed, "-", p.calls.stood, p.calls.scheduled], ["Appeals", p.appeals.overturned, p.appeals.partly, p.appeals.upheld, p.appeals.pending]] }}
          />
          <div className="mt-5 rounded-2xl border border-tile-edge bg-tile px-5 py-4">
            <div className="text-[13px] font-semibold">Requests on the Dashboard right now</div>
            <div className="mt-2 flex items-end gap-10">
              <div>
                <div className="text-[30px] leading-none font-semibold" data-testid="workload-handled">
                  {workload.handled}
                </div>
                <div className="mt-1 text-[13px] text-muted">handled</div>
              </div>
              <div>
                <div className="text-[30px] leading-none font-semibold" data-testid="workload-open">
                  {workload.open}
                </div>
                <div className="mt-1 text-[13px] text-muted">still open</div>
              </div>
            </div>
            <Meter className="mt-3" height={8} value={total ? (workload.handled / total) * 100 : 0} color="#2F6F5C" />
            <p className="mt-2 text-[12px] text-muted">
              {scopeWords}. Handled means the payer has decided. {workload.needsYou === 0 ? "Nothing waits on you." : `${workload.needsYou} of the open ${workload.needsYou === 1 ? "request waits" : "requests wait"} on you.`} Live: it changes when you answer a payer or accept a denial. It does not follow the period or the diagnosis group.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** One line for the closed section. */
export function processSummary(board: Board): string {
  const p = board.process;
  const retroShare = pctOf(p.retro.n, board.s.n);
  const refs = p.referral.filter((r) => r.avg !== null);
  const recent = refs.slice(-3);
  const days = recent.length ? Math.round((recent.reduce((a, r) => a + (r.avg ?? 0), 0) / recent.length) * 10) / 10 : null;
  return `${retroShare === null ? "No" : `${retroShare}%`} of decisions were retro-authorizations${board.s.n ? ` (${fmt(p.retro.n)})` : ""}. Referral to authorization takes ${days === null ? "-" : days} days lately.`;
}
