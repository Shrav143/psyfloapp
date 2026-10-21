import { CheckCircle2, Lightbulb, Link2 } from "lucide-react";
import { AgentBadge, Button, Card, CardBody, CardHeader, Label, Pill } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Finding } from "./lib/analysis";
import type { DenialView } from "./lib/useDenialView";
import { useStore } from "@/store";

export function AgentsDidCard({ view }: { view: DenialView }) {
  const { analysis } = view;
  return (
    <Card>
      <CardHeader title="What the agents did" right={<Pill tone="good" dot>Done in {analysis.doneIn}</Pill>} />
      {analysis.steps.map((s) => (
        <div key={s.agent} className="flex items-center gap-3 border-b border-line px-6 py-2.5 last:border-b-0">
          <AgentBadge agent={s.agent} size={32} />
          <span className="flex-1">{s.text}</span>
          <CheckCircle2 size={18} className="ico text-good" aria-label="Done" />
        </div>
      ))}
    </Card>
  );
}

export function PayerSaidCard({ view }: { view: DenialView }) {
  const { analysis } = view;
  return (
    <Card>
      <CardHeader title={`What ${analysis.ctx.payer} said`} />
      <CardBody>
        <blockquote className="rounded-r-xl border-l-[3px] border-risk bg-risk-bg px-4 py-3 text-risk-ink">{analysis.quote}</blockquote>
        <Label className="mt-4 mb-1.5">What the chart shows</Label>
        <p className="leading-[1.7]">{analysis.chartShows}</p>
      </CardBody>
    </Card>
  );
}

/** Each finding has a severity, a source chip that opens the chart excerpt, and a suggested fix the user can add to the evidence. */
export function WeakPointsCard({ view, onSource }: { view: DenialView; onSource: (f: Finding) => void }) {
  const { req, analysis, work } = view;
  const setFix = useStore((s) => s.setFix);
  return (
    <Card>
      <CardHeader title="Where the denial is weak" subtitle="Each finding links to the chart, with a suggested fix" />
      {analysis.findings.map((f) => {
        const added = work.fixes.includes(f.id);
        return (
          <div key={f.id} className="flex items-start gap-3.5 border-b border-line px-6 py-4 last:border-b-0">
            <Pill tone={f.sev === "Critical" ? "risk" : "mid"} className="mt-0.5">{f.sev}</Pill>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{f.title}</div>
              <div className="text-[13.5px] text-muted">{f.detail}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2.5">
                <button type="button" onClick={() => onSource(f)} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-bg px-2.5 py-[3px] text-xs font-semibold text-neutral-ink hover:bg-[#EADFD0]">
                  <Link2 size={12} className="ico" />
                  {f.source}
                </button>
                <span className="inline-flex items-center gap-1.5 text-[13px] text-ink2">
                  <Lightbulb size={14} className="ico text-mid" />
                  Suggested fix: {f.fix}
                </span>
                <Button size="sm" variant={added ? "ghost" : "outline"} icon={added ? CheckCircle2 : undefined} onClick={() => setFix(req.id, f.id, !added)} aria-pressed={added}>
                  {added ? "Added to the evidence" : "Add to the evidence"}
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </Card>
  );
}

const DOT = { good: "bg-good", mid: "bg-mid", risk: "bg-risk", neutral: "bg-faint" } as const;

export function DimensionsCard({ view }: { view: DenialView }) {
  const { analysis } = view;
  if (!analysis.dims.length) return null;
  return (
    <Card>
      <CardHeader title="The six ASAM dimensions" subtitle={`What the chart shows on each one${analysis.dimsSub ? ` · ${analysis.dimsSub}` : ""}`} />
      <CardBody className="grid grid-cols-2 gap-3">
        {analysis.dims.map((d) => (
          <div key={d.name} className="rounded-2xl border border-tile-edge bg-tile px-4 py-3.5">
            <div className="flex items-center gap-2">
              <span className={cn("h-[9px] w-[9px] rounded-full", DOT[d.tone])} aria-hidden="true" />
              <b>{d.name}</b>
            </div>
            <p className="mt-1.5 text-[13.5px] text-ink2">{d.text}</p>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
