import { ArrowRight, Check, TriangleAlert } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Chip, Label, Lines, Meter, Pill } from "@/components/ui";
import type { AsamDim } from "@/data/caseDetail";
import { openFor } from "@/data/caseModel";
import type { Tone } from "@/data/types";
import { cn } from "@/lib/cn";
import type { CaseCtx } from "../caseTypes";
import { EvidenceChip } from "../EvidenceChip";

const LEVEL: { word: string; tone: Tone }[] = [{ word: "None", tone: "good" }, { word: "Low", tone: "good" }, { word: "Moderate", tone: "mid" }, { word: "High", tone: "risk" }, { word: "Severe", tone: "risk" }];
const TEXT_TONE: Record<Tone, string> = { good: "#2F6F5C", mid: "#8F6620", risk: "#B5553A", neutral: "#1B1B19" };

function Dim({ d }: { d: AsamDim }) {
  const lv = LEVEL[d.level];
  return (
    <div className="rounded-2xl border border-tile-edge bg-tile px-4 py-3.5">
      <div className="flex items-start gap-3">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-neutral-bg text-xs font-semibold">{d.n}</span>
        <div className="min-w-0 flex-1 font-semibold leading-snug">{d.name}</div>
        <Pill tone={lv.tone} dot>{lv.word}</Pill>
      </div>
      <div className="mt-1.5 ml-9 text-[13.5px] text-ink2">{d.sentence}</div>
    </div>
  );
}

export function PictureTab({ ctx }: { ctx: CaseCtx }) {
  const { detail, work, goTab } = ctx;
  const s = detail.summary;
  const open = openFor(detail, work);
  const eng = detail.engagement.pct;
  const engWord = eng >= 85 ? "Strong" : eng >= 70 ? "Moderate" : "Low";
  const rows: { label: string; body: React.ReactNode; source: keyof typeof s.sources }[] = [
    { label: "Diagnosis", body: s.diagnosis, source: "diagnosis" },
    { label: "Status", body: <Pill tone={s.status.tone} dot>{s.status.text}</Pill>, source: "status" },
    { label: "Trajectory", body: s.trajectory, source: "trajectory" },
    { label: "Readiness", body: open.length === 0 ? "The draft is ready for signature." : s.readiness, source: "readiness" },
  ];
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-5">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader title="Clinical picture" subtitle="Built by Reader and Placement from the chart. Every line links back to a file." right={<Chip>{detail.levelLabel}</Chip>} />
          <CardBody className="flex flex-col gap-3.5">
            {rows.map((r) => (
              <div key={r.label} className="grid grid-cols-[104px_minmax(0,1fr)] items-start gap-3">
                <Label className="pt-1">{r.label}</Label>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span>{r.body}</span>
                  <EvidenceChip evidence={s.sources[r.source]} detail={detail} />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="ASAM dimensions" subtitle="Placement maps the chart to the six dimensions. The words show how much each one weighs on the level of care." />
          <CardBody className="grid grid-cols-2 gap-3">
            {detail.asam.map((d) => <Dim key={d.n} d={d} />)}
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="Symptom and function trend" subtitle="Scores from the chart, by date. A missing score is left as a gap."
            right={<div className="flex gap-4 text-sm">{detail.trend.map((t) => <span key={t.name} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />{t.name}</span>)}</div>}
          />
          <CardBody>
            <Lines series={detail.trend} labels={detail.trendLabels} height={190} />
            <div className="mt-3 grid grid-cols-2 gap-3">
              {detail.keyScores.map((k) => (
                <div key={k.label} className="rounded-2xl border border-tile-edge bg-tile py-3 text-center">
                  <Label>{k.label}</Label>
                  <div className="mt-0.5 text-[22px] font-semibold" style={{ color: TEXT_TONE[k.tone] }}>{k.value} <span className="text-sm font-medium text-muted">{k.of}</span></div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader title="What stands out" />
          <CardBody className="flex flex-col gap-2.5">
            {detail.standsOut.map((t) => <div key={t} className="flex items-start gap-2.5"><ArrowRight size={14} className="ico mt-[5px] text-muted" /><span>{t}</span></div>)}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Engagement and behavior" right={<Pill tone={eng >= 70 ? "good" : "mid"}>{engWord}</Pill>} />
          <CardBody>
            <div className="flex items-center gap-3"><b className="text-[22px] text-good">{eng}%</b><Meter value={eng} className="flex-1" height={8} color="#2F6F5C" /></div>
            {detail.engagement.checks.map((t) => <div key={t} className="mt-2.5 flex items-center gap-2 text-[13.5px]"><Check size={14} className="ico text-good" />{t}</div>)}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Still open" right={<Pill tone={open.length ? "mid" : "good"}>{open.length}</Pill>} />
          <CardBody className="flex flex-col gap-3" >
            {open.length === 0 ? <div className="flex items-center gap-2 text-[13.5px] text-good-ink"><Check size={14} className="ico text-good" />Nothing is open. Every conflict, document and risk is settled.</div> : null}
            {open.map((o) => (
              <div key={o.id} className="flex items-start gap-2.5">
                <TriangleAlert size={15} className={cn("ico mt-0.5", "text-mid")} aria-label={o.kind === "conflict" ? "Conflict" : o.kind === "missing" ? "Missing" : "Risk"} />
                <div className="min-w-0 flex-1 text-[13.5px] text-mid-ink">{o.text}</div>
                <Button size="sm" variant="ghost" onClick={() => goTab("actions", o.fixRec)}>Settle it</Button>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
