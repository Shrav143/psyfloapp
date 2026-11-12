import { Card, CardBody, CardHeader, CHART, DonutChart, HBarChart, ParetoChart, StackedHBars } from "@/components/ui";
import { PAYER_ORDER, REASON_CATEGORIES, type ReasonCategory } from "@/data/analytics";
import { DX_LABEL, type DxId } from "@/data/decisions";
import { payerById } from "@/data/seed";
import type { Board } from "./board";
import type { CaseQuery } from "./query";
import { fmt, pctOf } from "./stats";

/** Why decisions are not approved as requested: a Pareto of reasons with the preventable ones marked, the preventable share, and the reasons by diagnosis group. */
export function ReasonsCard({ board, onOpen }: { board: Board; onOpen: (q: CaseQuery) => void }) {
  const r = board.reasons;
  const total = r.total;
  const share = pctOf(r.preventable, total);
  if (total === 0) {
    return (
      <Card>
        <CardHeader title="Denial reasons" subtitle="No denials in this view." />
      </Card>
    );
  }
  const rows = r.rows.map((x) => ({ key: x.label, label: x.label, count: x.count, share: x.share, cum: x.cum, marked: x.preventable, other: x.other, sub: x.other ? undefined : x.payers.map((p) => payerById(p).shortName).join(", ") }));
  const open = (key: string) => {
    const row = r.rows.find((x) => x.label === key);
    if (!row) return;
    const single = row.payers.length === 1 && !row.other ? row.payers[0] : undefined;
    onOpen({ reasons: row.labels, ...(single ? { payer: single } : {}), title: row.label, note: row.other ? "The reasons beyond the most common, each denied or approved in part." : "Every denial with this reason, denied or approved in part." });
  };
  const parts = [
    { key: "preventable", label: "Preventable", value: r.preventable, color: CHART.mid, hatch: true, note: "The team could have fixed it before sending" },
    { key: "not", label: "Not preventable", value: total - r.preventable, color: CHART.umber, note: "The payer read its criteria differently" },
  ];
  const CAT_COLOR: Record<ReasonCategory, string> = { documentation: CHART.forest, timing: CHART.mid, level: CHART.risk, admin: CHART.neutral };
  const legend = REASON_CATEGORIES.map((c) => ({ key: c.id, label: c.label, color: CAT_COLOR[c.id] }));
  const prevByPayer = PAYER_ORDER.map((p) => ({ p, n: board.cur.filter((d) => d.payerId === p && d.outcome !== "approved").length, k: board.cur.filter((d) => d.payerId === p && d.outcome !== "approved" && d.preventable).length })).filter((x) => x.n > 0).sort((a, b) => b.k - a.k);
  return (
    <Card data-testid="reasons-card">
      <CardHeader title="Denial reasons" subtitle={`${fmt(total)} denials, ${fmt(r.preventable)} of them preventable (${share}%). Click a reason, a slice or a bar to see its cases.`} />
      <CardBody className="flex flex-col gap-8">
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.55fr_1fr]">
          <div>
            <h4 className="mb-2 text-[14px] font-semibold">Most common reasons</h4>
            <ParetoChart
              ariaLabel="Denial reasons, most common first"
              rows={rows}
              total={total}
              markLabel="Preventable"
              onRow={open}
              summary={`${fmt(total)} denials. The most common reason is ${rows[0].label} with ${rows[0].count} (${rows[0].share}%). ${r.preventable} denials (${share}%) were preventable.`}
              table={{ caption: "Denial reasons", head: ["Reason", "Denials", "Share of denials", "Running share", "Preventable", "Payers"], rows: rows.map((x) => [x.label, x.count, `${x.share}%`, `${x.cum}%`, x.marked ? "Yes" : "No", x.sub ?? "Several"]) }}
            />
          </div>
          <div>
            <h4 className="mb-2 text-[14px] font-semibold">Preventable or not</h4>
            <DonutChart
              ariaLabel="Preventable and not preventable denials"
              parts={parts}
              size={150}
              thickness={24}
              center={
                <>
                  <span className="block text-[24px] leading-none font-semibold">{share}%</span>
                  <span className="mt-1 block text-[11px] text-muted">preventable</span>
                </>
              }
              onPart={(k) => onOpen(k === "preventable" ? { flag: "preventable", title: "Preventable denials", note: "The team could have fixed the documentation or the timing before sending." } : { flag: "notPreventable", title: "Denials that were not preventable", note: "The payer read its criteria differently, so better paperwork alone would not change them." })}
              summary={`${r.preventable} of ${total} denials (${share}%) were preventable; ${total - r.preventable} were not.`}
              table={{ caption: "Preventable denials", head: ["Kind", "Denials", "Share"], rows: parts.map((p) => [p.label, p.value, `${pctOf(p.value, total)}%`]) }}
            />
            {prevByPayer.length > 1 ? (
              <div className="mt-6">
                <h4 className="mb-1 text-[14px] font-semibold">Preventable denials by payer</h4>
                <HBarChart
                  ariaLabel="Preventable denials by payer"
                  rows={prevByPayer.map((x) => ({ key: x.p, label: payerById(x.p).shortName, value: x.k, display: String(x.k), sub: `${pctOf(x.k, x.n)}% of ${x.n} denials`, color: CHART.mid }))}
                  max={Math.max(1, ...prevByPayer.map((x) => x.k))}
                  labelWidth={120}
                  valueWidth={36}
                  onRow={(k) => onOpen({ payer: k as (typeof PAYER_ORDER)[number], flag: "preventable", title: `${payerById(k as (typeof PAYER_ORDER)[number]).name}: preventable denials`, note: "The team could have fixed the documentation or the timing before sending." })}
                  summary={`Preventable denials by payer: ${prevByPayer.map((x) => `${payerById(x.p).shortName} ${x.k}`).join(", ")}.`}
                  table={{ caption: "Preventable denials by payer", head: ["Payer", "Preventable", "All denials"], rows: prevByPayer.map((x) => [payerById(x.p).name, x.k, x.n]) }}
                />
              </div>
            ) : null}
          </div>
        </div>
        <div>
          <h4 className="mb-0.5 text-[14px] font-semibold">Reasons by diagnosis group</h4>
          <p className="mb-3 text-[13px] text-muted">Each bar is the mix of reasons behind that group's denials, in four kinds. The number is how many denials. Hover a segment for its count; click a bar for its cases.</p>
          <StackedHBars
            ariaLabel="Denial reasons by diagnosis group"
            legend={legend}
            rows={r.byDx.map((d) => ({ key: d.dx, label: DX_LABEL[d.dx], total: d.total, segments: d.segments.map((s) => ({ key: s.id, label: s.label, value: s.count, color: CAT_COLOR[s.id] })) }))}
            onRow={(k) => onOpen({ dx: k as DxId, outcome: "notApproved", title: `${DX_LABEL[k as DxId]}: denials`, note: "Every denial for this diagnosis group, denied or approved in part." })}
            summary={`Denials by diagnosis group: ${r.byDx.map((d) => `${DX_LABEL[d.dx]} ${d.total}`).join(", ")}.`}
            table={{ caption: "Denial reasons by diagnosis group", head: ["Diagnosis group", ...legend.map((l) => l.label), "Total"], rows: r.byDx.map((d) => [DX_LABEL[d.dx], ...d.segments.map((s) => s.count), d.total]) }}
          />
        </div>
      </CardBody>
    </Card>
  );
}
