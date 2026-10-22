import { useMemo } from "react";
import { Copy } from "lucide-react";
import { Button, Drawer } from "@/components/ui";
import type { Decision } from "@/data/decisions";
import { MONTHS, type DxId } from "@/data/decisions";
import type { BuiltInPayerId } from "@/data/types";
import { CHART, HBarChart, TrendChart, type BarRow } from "@/components/ui";
import { cmsApplies } from "@/data/decisions";
import { CaseTable } from "./CaseTable";
import { filterWords, periodInfo, type Filters } from "./filters";
import { buildPayerView, type GroupBar } from "./payerView";
import { cellQuery, type MatrixKey } from "./board";
import type { CaseQuery } from "./query";
import { avgDays, fmt, pctOf, pctText, ptsText } from "./stats";
import { payerSummary } from "./summary";
import { useCopy } from "./useCopy";

/* The Payer analysis panel: one payer's figures, its twelve months, what it tends to do, where it approves and where it does not, why it denies,
   and the cases behind every number. Everything is computed from that payer's records, for the period and filters on the page. */

const rows = (g: GroupBar[], color: string): BarRow[] =>
  g.map((x) => ({ key: x.key, label: x.label, value: x.rate, marker: x.clinic, display: x.rate === null ? "-" : `${x.rate}%`, sub: `${x.n} ${x.n === 1 ? "decision" : "decisions"}`, color: x.rate !== null && x.rate < 55 ? CHART.risk : color, quiet: x.n < 10 }));
const tableOf = (title: string, g: GroupBar[]) => ({ caption: `${title}: approved as requested`, head: [title, "Decisions", "Approved as requested", "Clinic, all payers"], rows: g.map((x) => [x.label, x.n, x.rate === null ? "-" : `${x.rate}%`, x.clinic === null ? "-" : `${x.clinic}%`]) });

export function PayerPanel({ payer, scoped, filters, siteLabel, width, onCases, onCase, onClose }: { payer: BuiltInPayerId; scoped: readonly Decision[]; filters: Filters; siteLabel: string; width: number; onCases: (q: CaseQuery) => void; onCase: (d: Decision) => void; onClose: () => void }) {
  const copy = useCopy();
  const v = useMemo(() => buildPayerView(scoped, filters, payer), [scoped, filters, payer]);
  const period = periodInfo(filters.period);
  const words = filterWords({ ...filters, payer: "all" });
  const clinic = v.clinic;
  const compare: Record<string, string> = {
    approval: `Clinic ${pctText(pctOf(clinic.approved, clinic.n))}`,
    denial: `Clinic ${pctText(pctOf(clinic.notApproved, clinic.n))}`,
    firstPass: `Clinic ${pctText(pctOf(clinic.firstPass, clinic.n))}`,
    time: `Clinic ${avgDays(clinic) === null ? "-" : `${avgDays(clinic)?.toFixed(1)} days`}`,
    preventable: `Clinic ${pctText(pctOf(clinic.preventable, clinic.notApproved))} of denials`,
    appeals: `Clinic ${pctText(pctOf(clinic.overturned, clinic.rulings))}`,
  };
  const open = (key: MatrixKey, id: string, label: string) => {
    const q = cellQuery(key, payer, id);
    onCases({ ...q, title: `${v.name}: ${label}`, note: `Approved as requested and not, for ${label.toLowerCase()} at ${v.name}.` });
  };
  const monthQ = (i: number) => onCases({ payer, month: i, title: `${v.name}: ${MONTHS[i].long}`, note: `Every decision ${v.name} made in the month from ${MONTHS[i].range}.` });
  const approvalTrend = v.months.map((m) => pctOf(m.s.approved, m.s.n));
  const denialTrend = v.months.map((m) => pctOf(m.s.notApproved, m.s.n));
  const clinicTrend = v.clinicMonths.map((m) => pctOf(m.s.approved, m.s.n));
  const reasonRows = v.reasons.map((r) => ({ key: r.label, label: r.label, value: r.count, display: String(r.count), sub: `${r.share}% of denials`, color: r.preventable ? CHART.mid : CHART.umber, tag: r.preventable ? "Preventable" : undefined }));
  const topReason = Math.max(1, ...v.reasons.map((r) => r.count));
  const cms = cmsApplies(payer);

  return (
    <Drawer
      open
      onClose={onClose}
      width={width}
      title={v.name}
      subtitle={
        <span data-testid="payer-sub">
          {v.plan} · {period.label} · {siteLabel}
          {words ? ` · ${words}` : ""} · {fmt(v.s.n)} decisions
        </span>
      }
      right={
        <Button size="sm" icon={Copy} onClick={() => copy(payerSummary(v, filters, siteLabel, v.figures), "Payer summary copied")}>
          Copy summary
        </Button>
      }
    >
      <div className="flex flex-col gap-8" data-testid="payer-panel">
        <section aria-label="Headline figures" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {v.figures.map((f) => (
            <button key={f.id} type="button" onClick={() => onCases({ ...f.query, payer, title: `${v.name}: ${f.query.title}` })} data-testid={`payer-figure-${f.id}`} className="rounded-2xl border border-edge bg-white px-4 py-3.5 text-left hover:bg-[#FBF8F3]">
              <div className="text-[11.5px] font-medium tracking-[0.08em] text-muted uppercase">{f.label}</div>
              <div className="mt-1 text-[26px] leading-none font-semibold tabular-nums">{f.value}</div>
              <div className="mt-1.5 text-[12px] text-muted">{compare[f.id]}</div>
              {f.change ? <div className="mt-0.5 text-[12px] text-ink2">{f.change.text}</div> : null}
            </button>
          ))}
        </section>

        <section aria-labelledby="tends-title">
          <h3 id="tends-title" className="font-serif text-[19px] font-semibold">
            What this payer tends to do
          </h3>
          <ul className="mt-2 flex flex-col gap-2.5" data-testid="tends">
            {v.insights.map((t) => (
              <li key={t} className="flex gap-3 text-[14.5px] leading-snug">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-forest" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] text-muted">Worked out from this payer's own decisions and compared with the clinic's other payers. {cms ? "The CMS decision time applies to this plan: 72 hours expedited, 7 calendar days standard. Check your state." : ""}</p>
        </section>

        <section aria-labelledby="ptrend-title">
          <h3 id="ptrend-title" className="font-serif text-[19px] font-semibold">
            Approvals and denials by month
          </h3>
          <p className="mb-2 text-[13px] text-muted">Click a month to list its cases.</p>
          <TrendChart
            ariaLabel={`${v.name}: approval and denial rate by month`}
            labels={MONTHS.map((m) => m.label)}
            details={MONTHS.map((m) => m.range)}
            height={230}
            format={(x) => `${Math.round(x)}%`}
            yMax={100}
            highlight={{ from: period.months[0], to: period.months[1], label: period.label }}
            onPoint={monthQ}
            extra={(i) => `${v.months[i].s.n} decisions`}
            series={[
              { key: "approval", name: `${v.name} approval rate`, color: CHART.good, values: approvalTrend, area: true },
              { key: "denial", name: `${v.name} denial rate`, color: CHART.risk, values: denialTrend },
              { key: "clinic", name: "Clinic approval rate", color: CHART.neutral, values: clinicTrend, dashed: true },
            ]}
            summary={`${v.name} approved as requested ${approvalTrend[0] ?? "-"}% of decisions in ${MONTHS[0].label} and ${approvalTrend[11] ?? "-"}% in ${MONTHS[11].label}. The clinic's rate across all payers went from ${clinicTrend[0] ?? "-"}% to ${clinicTrend[11] ?? "-"}%.`}
            table={{ caption: `${v.name} by month`, head: ["Month", "Decisions", "Approval rate", "Denial rate", "Clinic approval rate"], rows: v.months.map((m, i) => [m.month.range, m.s.n, approvalTrend[i] === null ? "-" : `${approvalTrend[i]}%`, denialTrend[i] === null ? "-" : `${denialTrend[i]}%`, clinicTrend[i] === null ? "-" : `${clinicTrend[i]}%`]) }}
          />
        </section>

        <section aria-labelledby="pdx-title">
          <h3 id="pdx-title" className="font-serif text-[19px] font-semibold">
            Approval by diagnosis group
          </h3>
          <p className="mb-2 text-[13px] text-muted">Approved as requested. The black tick is the clinic's rate across all payers. Click a bar for its cases.</p>
          <HBarChart
            ariaLabel={`${v.name}: approval by diagnosis group`}
            rows={rows(v.groups.dx, CHART.good)}
            labelWidth={190}
            legend={[{ name: "This payer", color: CHART.good }, { name: "Below 55%", color: CHART.risk }, { name: "Clinic, all payers", color: CHART.ink, marker: true }]}
            onRow={(k) => open("dx", k as DxId, v.groups.dx.find((g) => g.key === k)?.label ?? k)}
            rowHint={(r) => `${r.label}: ${r.display} approved, ${r.sub}. Open the cases.`}
            summary={`Approval by diagnosis group at ${v.name}: ${v.groups.dx.filter((g) => g.rate !== null).map((g) => `${g.label} ${g.rate}%`).join(", ")}.`}
            table={tableOf("Diagnosis group", v.groups.dx)}
          />
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h4 className="mb-1 text-[14px] font-semibold">By program</h4>
              <HBarChart
                ariaLabel={`${v.name}: approval by program`}
                rows={rows(v.groups.program, CHART.good)}
                labelWidth={96}
                onRow={(k) => open("program", k, v.groups.program.find((g) => g.key === k)?.label ?? k)}
                summary={`Approval by program at ${v.name}: ${v.groups.program.map((g) => `${g.label} ${g.rate ?? "-"}%`).join(", ")}.`}
                table={tableOf("Program", v.groups.program)}
              />
            </div>
            <div>
              <h4 className="mb-1 text-[14px] font-semibold">By request type</h4>
              <HBarChart
                ariaLabel={`${v.name}: approval by request type`}
                rows={rows(v.groups.kind, CHART.good)}
                labelWidth={120}
                onRow={(k) => open("kind", k, v.groups.kind.find((g) => g.key === k)?.label ?? k)}
                summary={`Approval by request type at ${v.name}: ${v.groups.kind.map((g) => `${g.label} ${g.rate ?? "-"}%`).join(", ")}.`}
                table={tableOf("Request type", v.groups.kind)}
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="preasons-title">
          <h3 id="preasons-title" className="font-serif text-[19px] font-semibold">
            Top denial reasons
          </h3>
          <p className="mb-2 text-[13px] text-muted">
            {v.s.notApproved === 0 ? "No denials in this view." : `${fmt(v.s.notApproved)} denials, ${fmt(v.s.preventable)} of them preventable. Click a reason for its cases.`}
          </p>
          {reasonRows.length ? (
            <HBarChart
              ariaLabel={`${v.name}: top denial reasons`}
              rows={reasonRows}
              max={topReason}
              labelWidth={230}
              valueWidth={36}
              onRow={(k) => onCases({ payer, reasons: [k], title: `${v.name}: ${k}`, note: "Every denial with this reason, approved in part or denied." })}
              summary={`Denial reasons at ${v.name}: ${v.reasons.map((r) => `${r.label} ${r.count}`).join(", ")}.`}
              table={{ caption: `Denial reasons at ${v.name}`, head: ["Reason", "Denials", "Share of denials", "Preventable"], rows: v.reasons.map((r) => [r.label, r.count, `${r.share}%`, r.preventable ? "Yes" : "No"]) }}
            />
          ) : null}
        </section>

        <section aria-labelledby="pcases-title">
          <h3 id="pcases-title" className="font-serif text-[19px] font-semibold">
            The cases behind these numbers
          </h3>
          <p className="mb-3 text-[13px] text-muted">{fmt(v.rows.length)} decisions in {period.phrase}. Click a case for its summary.</p>
          <CaseTable rows={v.rows} onOpen={onCase} label={`${v.name} cases`} />
        </section>
      </div>
    </Drawer>
  );
}
