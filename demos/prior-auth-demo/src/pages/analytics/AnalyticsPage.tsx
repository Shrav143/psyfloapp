import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, FileCheck, FileText, ThumbsUp } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Donut, Dropdown, HBars, Label, ListRow, Page, PageHeader, Stat, Table, Td, Th, Tr } from "@/components/ui";
import { PERIODS, type PayerFilter, type PeriodId } from "@/data/analytics";
import { band } from "@/lib/format";
import { PAYER_OPTIONS } from "@/pages/dashboard/helpers";
import { paths } from "@/routes";
import { ReportModal } from "./ReportModal";
import { buildView, fmt, trendLine, type Tile, type View } from "./model";
import { useRipples } from "./useRipples";

const NOT_ENOUGH = "Not enough decisions yet";
const PERIOD_OPTIONS = PERIODS.map((p) => ({ value: p.id, label: p.label }));

/** Two small lines under a tile's number: what it means, and how many decisions are behind it. */
function sub(tile: Tile, context: string, period: string): ReactNode {
  return (
    <>
      <div>{tile.value === null ? NOT_ENOUGH : context}</div>
      <div className="mt-0.5 text-[11.5px] opacity-75">
        {fmt(tile.n)} {tile.unit} · {period}
      </div>
    </>
  );
}
const hidden = (t: Tile): string => (t.value === null ? "-" : `${t.value}%`);

/** Under the denial table: how appeals ended and how many denials were accepted. Both move when Denial Intelligence records a ruling or an accepted denial. */
function DenialOutcomes({ v }: { v: View }) {
  const { appeals, accepted, period } = v;
  return (
    <div className="grid grid-cols-2 gap-6 border-t border-line px-6 py-4">
      <div>
        <Label>Appeals overturned</Label>
        <div className="mt-1 flex items-baseline gap-2">
          <b className="text-xl">{hidden(appeals)}</b>
          <span className="text-[13px] text-muted">{appeals.value === null ? NOT_ENOUGH : `${fmt(appeals.overturned)} of ${fmt(appeals.n)} rulings ${period.phrase}`}</span>
        </div>
      </div>
      <div>
        <Label>Denials accepted</Label>
        <div className="mt-1 flex items-baseline gap-2">
          <b className="text-xl">{fmt(accepted.n)}</b>
          <span className="text-[13px] text-muted">
            {accepted.n === 1 ? "denial" : "denials"} {period.phrase}
          </span>
        </div>
      </div>
    </div>
  );
}

function NotEnough() {
  return <div className="px-6 py-10 text-center text-sm text-muted">{NOT_ENOUGH}. Figures based on fewer than 20 decisions stay hidden.</div>;
}

/** Performance: where approvals are won and lost, and whether the advice is working. */
export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodId>("quarter");
  const [payer, setPayer] = useState<PayerFilter>("all");
  const [report, setReport] = useState(false);
  const ripples = useRipples();
  const v = useMemo(() => buildView(period, payer, ripples), [period, payer, ripples]);
  const phrase = v.period.phrase;
  const hiddenBars = v.bars.filter((b) => b.value === null);

  return (
    <Page>
      <PageHeader
        title="Analytics"
        sub="Where approvals are won and lost, and whether the advice is working."
        actions={
          <>
            <Dropdown ariaLabel="Period" value={period} options={PERIOD_OPTIONS} onChange={setPeriod} />
            <Dropdown ariaLabel="Payer" value={payer} defaultValue="all" options={PAYER_OPTIONS} onChange={setPayer} menuWidth={250} />
            <Button icon={FileText} onClick={() => setReport(true)}>
              Monthly report
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <Stat tone="good" icon={CheckCircle2} value={hidden(v.approved)} label="Approved as asked" sub={sub(v.approved, trendLine(v.approved.delta, v.period.prev), phrase)} />
        <Stat tone="risk" icon={AlertTriangle} value={hidden(v.topCause)} label="Top denial cause" sub={sub(v.topCause, v.topCause.label, phrase)} />
        <Stat tone="mid" icon={ThumbsUp} value={hidden(v.advice)} label="Advice taken works" sub={sub(v.advice, "Approved when applied", phrase)} />
        <Stat tone="neutral" icon={FileCheck} value={hidden(v.noEdits)} label="Sent without edits" sub={sub(v.noEdits, "As written, or a typo fixed", phrase)} />
      </div>

      <div className="grid grid-cols-2 items-start gap-5">
        <Card>
          <CardHeader title="Approval rate by payer" subtitle={`Approved as asked, ${phrase}`} />
          <CardBody>
            <HBars
              labelWidth={130}
              rows={v.bars.map((b) => ({ label: b.label, value: b.value ?? 0, color: b.value === null ? "#E5DCD0" : band(b.value).color, display: b.value === null ? "-" : `${b.value}%` }))}
            />
            <p className="mt-4 text-xs text-muted">
              {fmt(v.decisions)} decisions {phrase}. {hiddenBars.length ? `${hiddenBars.map((b) => b.label).join(", ")}: ${NOT_ENOUGH.toLowerCase()}. ` : ""}Green is 80 and above, ochre 55 to 79, terracotta below 55.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="How people edit agent drafts" subtitle={`Share of drafts, ${phrase}`} />
          {v.edits ? (
            <CardBody>
              <div className="flex items-center justify-center gap-8">
                <Donut
                  parts={v.edits.parts.map((p) => ({ value: p.share, color: p.color, label: p.label }))}
                  center={
                    <>
                      <span className="block text-[28px] font-semibold leading-none">{v.edits.parts[0].share}%</span>
                      <span className="mt-1 block text-[11px] text-muted">as written</span>
                    </>
                  }
                />
                <ul className="flex flex-col gap-3">
                  {v.edits.parts.map((p) => (
                    <li key={p.label} className="flex items-start gap-2.5">
                      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
                      <div>
                        <b>{p.label}</b>
                        <div className="text-xs text-muted">
                          {p.share}% · approved {p.approved}% of the time
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-4 text-center text-xs text-muted">{fmt(v.edits.n)} drafts {phrase}.</p>
            </CardBody>
          ) : (
            <NotEnough />
          )}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Common denial reasons by payer" subtitle={v.reasons ? `${v.period.label} · ${fmt(v.reasons.total)} denials in the reasons listed. Select a row to open those denials in Denial Intelligence.` : v.period.label} />
        {v.reasons ? (
          <Table>
            <thead>
              <tr>
                <Th>Reason</Th>
                <Th>Payer</Th>
                <Th>Count</Th>
                <Th>Share of denials</Th>
              </tr>
            </thead>
            <tbody>
              {v.reasons.rows.map((r) => (
                <Tr key={`${r.payerId}-${r.reason}`} onClick={() => navigate(paths.denials(undefined, { payer: r.payerId, reason: r.reason }))} data-reason={r.reason}>
                  <Td>
                    <button type="button" onClick={(e) => { e.stopPropagation(); navigate(paths.denials(undefined, { payer: r.payerId, reason: r.reason })); }} className="text-left hover:underline">
                      {r.reason}
                    </button>
                  </Td>
                  <Td className="text-muted">{r.payer}</Td>
                  <Td>{r.count}</Td>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <div className="h-1.5 w-[120px] overflow-hidden rounded-full bg-[#F0ECE4]">
                        <i className="block h-full rounded-full" style={{ width: `${Math.min(100, r.share * 3)}%`, background: "#B5553A" }} />
                      </div>
                      <b className="text-risk-ink">{r.share}%</b>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <NotEnough />
        )}
        <DenialOutcomes v={v} />
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="What helps most" subtitle="Steps taken most often, and how often those requests were approved" />
        {v.helps ? (
          v.helps.map((h, i) => (
            <ListRow key={h.label}>
              <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-neutral-bg text-xs font-semibold" aria-label={`Rank ${i + 1}`}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{h.label}</div>
                <div className="text-xs text-muted">Applied {fmt(h.applied)} times</div>
              </div>
              <b className="text-good">{h.approved}% approved</b>
            </ListRow>
          ))
        ) : (
          <NotEnough />
        )}
      </Card>

      {v.dismissed ? (
        <Card className="overflow-hidden">
          <CardHeader title="Why recommendations were dismissed" subtitle={`The reason given each time someone dismissed a recommendation, ${phrase}`} />
          {v.dismissed.map((d) => (
            <ListRow key={d.reason}>
              <div className="min-w-0 flex-1 font-semibold">{d.reason}</div>
              <b>{d.count === 1 ? "1 time" : `${d.count} times`}</b>
            </ListRow>
          ))}
        </Card>
      ) : null}

      {report ? <ReportModal view={v} onClose={() => setReport(false)} /> : null}
    </Page>
  );
}
