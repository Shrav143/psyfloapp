import { useState } from "react";
import { CircleCheck, CircleHelp, Check, TriangleAlert } from "lucide-react";
import { Banner, Button, Card, CardBody, CardHeader, Chip, Donut, Label, Pill } from "@/components/ui";
import { confidenceWord, driverView, groupRecs, gainOf, isBenchmarkOnly, outcomeSplit, rangeOf, similarTotal } from "@/data/caseModel";
import { payerById } from "@/data/seed";
import { band as chanceBand, plural } from "@/lib/format";
import type { CaseCtx } from "../caseTypes";
import { DriverBars, formulaOf } from "./DriverBars";
import { HowCalculatedModal, SeeAllModal } from "./RiskModals";

const MATCHED = ["Payer and plan", "Level of care", "Diagnosis cluster", "Review type", "Documentation signals"];

export function RiskTab({ ctx }: { ctx: CaseCtx }) {
  const { detail, work, chance } = ctx;
  const payer = payerById(detail.payerId);
  const [how, setHow] = useState(false);
  const [all, setAll] = useState(false);
  const { rows, total } = driverView(detail, work);
  const b = chanceBand(chance);
  const [lo, hi] = rangeOf(detail, chance);
  const [full, partly, denied] = outcomeSplit(chance);
  const sim = detail.similar;
  const n = similarTotal(detail);
  const bench = isBenchmarkOnly(detail);
  const open = groupRecs(detail, work).open;
  const top = [...open].sort((x, y) => gainOf(y) - gainOf(x))[0];
  const split = [
    { label: "Your own", value: sim.own, color: "#1D4F43" }, { label: "Network", value: sim.network, color: "#739C8E" }, { label: "Benchmark", value: sim.benchmark, color: "#D9CDBA" },
  ];
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader title="Historical outcomes" subtitle={`${payer.name} · ${detail.levelLabel} ${detail.type.toLowerCase()}`} right={bench ? <Pill tone="neutral">Benchmark estimate</Pill> : undefined} />
        <CardBody className="flex flex-wrap items-center gap-2">
          <Label className="mr-1.5">Matched on</Label>
          {MATCHED.map((m) => <Chip key={m} className="border border-field bg-white font-medium">{m}</Chip>)}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-risk-edge bg-risk-bg px-[18px] py-4 text-risk-ink">
          <div className="flex items-center gap-2 font-semibold"><TriangleAlert size={18} className="ico" />Biggest driver of a short approval</div>
          <div className="mt-1.5 font-semibold">{detail.biggest.title}</div>
          <div className="mt-1 text-sm">{detail.biggest.text}</div>
          <div className="mt-2 text-xs">{detail.biggest.seen}</div>
        </div>
        <div className="rounded-2xl border border-good-edge bg-good-bg px-[18px] py-4 text-good-ink">
          <div className="flex items-center gap-2 font-semibold"><CircleCheck size={18} className="ico" />What the approved cases had in common</div>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {detail.common.map((t) => <li key={t} className="flex items-center gap-2"><Check size={14} className="ico" />{t}</li>)}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Why this number" subtitle={<span data-testid="formula">{formulaOf(rows, total)}</span>} right={<Pill tone={b.tone} dot>{b.word} · {total}%</Pill>} />
            <DriverBars rows={rows} total={total} />
          </Card>
          <Card>
            <CardHeader title="Likely outcomes" subtitle="What the payer is likely to decide on this request" />
            <CardBody className="flex items-center gap-7">
              <Donut
                size={150} thickness={22}
                parts={[{ value: full, color: "#2F6F5C" }, { value: partly, color: "#A87A26" }, { value: denied, color: "#B5553A" }]}
                center={<><div className="text-[26px] leading-none font-semibold" style={{ color: b.color }}>{full}%</div><div className="mt-0.5 text-[11px] text-muted">as asked</div></>}
              />
              <ul className="flex flex-1 flex-col gap-2.5" data-testid="outcomes">
                {[["Approved as asked", full, "#2F6F5C"], ["Partly approved", partly, "#A87A26"], ["Denied", denied, "#B5553A"]].map(([l, v, c]) => (
                  <li key={l as string} className="flex items-center gap-2.5"><span className="h-3 w-3 rounded-full" style={{ background: c as string }} /><span className="flex-1">{l}</span><b>{v}%</b></li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="How sure are we" right={<Pill tone={bench ? "neutral" : "good"}>{confidenceWord(detail)}</Pill>} />
            <CardBody>
              <div className="flex items-baseline gap-3">
                <span className="text-[28px] leading-none font-semibold" style={{ color: b.color }}>{lo}–{hi}%</span>
                <span className="text-sm text-muted">likely range · {b.word}</span>
              </div>
              <div className="mt-4 flex h-3 overflow-hidden rounded-full" role="img" aria-label={`${sim.own} yours, ${sim.network} network, ${sim.benchmark} benchmark`}>
                {split.map((s) => <i key={s.label} className="block h-full" style={{ width: `${(s.value / n) * 100}%`, background: s.color }} />)}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
                {split.map((s) => <span key={s.label} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.label} <b>{s.value}</b></span>)}
              </div>
              <div className="mt-2 text-[13px] text-muted">{bench ? `Little history, so this is a benchmark estimate. ${n.toLocaleString("en-US")} similar cases in all.` : `Based on ${n.toLocaleString("en-US")} similar cases.`}</div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Comparable decisions" right={<Button variant="ghost" size="sm" onClick={() => setAll(true)}>See all</Button>} />
            <div>
              {detail.comparable.map((c) => (
                <div key={c.what} className="flex items-center gap-3 border-b border-line px-6 py-3.5 last:border-b-0">
                  <div className="flex-1"><div className="font-semibold">{c.what}</div><div className="text-xs text-muted">{c.who} · {c.match}</div></div>
                  <Pill tone={c.tone}>{c.outcome}</Pill>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Can you trust it?" right={<Pill tone="good" dot>Calibrated</Pill>} />
            <CardBody className="flex flex-col gap-2.5">
              <div data-testid="calibration">Forecaster said <b>{detail.calibration.said}</b> for similar {payer.shortName} requests. <b>{detail.calibration.actual}%</b> were approved in full, across {detail.calibration.n} decisions.</div>
              <div className="text-sm text-muted">Checked every night against what payers actually decided.</div>
              <div><Button variant="ghost" icon={CircleHelp} onClick={() => setHow(true)}>How it is calculated</Button></div>
            </CardBody>
          </Card>
        </div>
      </div>

      <Banner tone={chance >= 80 ? "good" : "mid"} icon={chance >= 80 ? CircleCheck : TriangleAlert}>
        <b className="font-semibold">Where this stands:</b>{" "}
        {top ? `${b.word.toLowerCase()}, with ${open.length} ${open.length === 1 ? "step" : "steps"} left. The biggest single step is to ${top.title[0].toLowerCase()}${top.title.slice(1)} (+${plural(gainOf(top), "pt")}).` : "every recommended action is applied. The draft is as strong as the chart allows."}
      </Banner>
      {how ? <HowCalculatedModal detail={detail} onClose={() => setHow(false)} /> : null}
      {all ? <SeeAllModal detail={detail} onClose={() => setAll(false)} /> : null}
    </div>
  );
}
