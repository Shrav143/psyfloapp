import { useMemo, useState } from "react";
import { CheckCircle2, Link2 } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Disclosure, HistoryFeed, Label, Pill } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useStore } from "@/store";
import type { Dimension, Finding } from "./lib/analysis";
import { denialHistory } from "./lib/history";
import { DIM_TONE_WORD } from "./lib/long";
import type { DenialView } from "./lib/useDenialView";
import { DimensionModal } from "./DimensionModal";
import { DimensionsSummary, WeakPointsSummary } from "./FullSummary";

export function PayerSaidCard({ view }: { view: DenialView }) {
  const { analysis } = view;
  return (
    <Card>
      <CardHeader title={`What ${analysis.ctx.payer} said`} />
      <CardBody>
        <blockquote className="max-w-[80ch] rounded-r-xl border-l-[3px] border-risk bg-risk-bg px-4 py-2.5 text-risk-ink">{analysis.quote}</blockquote>
        <Label className="mt-3.5 mb-1">What the chart shows</Label>
        <p className="max-w-[80ch]">{analysis.chartShows}</p>
      </CardBody>
    </Card>
  );
}

/** Each finding: its severity, the chart source (opens the excerpt) and the suggested fix, which can be added to the evidence. */
export function WeakPointsCard({ view, onSource }: { view: DenialView; onSource: (f: Finding) => void }) {
  const { req, analysis, work } = view;
  const setFix = useStore((s) => s.setFix);
  return (
    <Card id="denial-weak-points" tabIndex={-1} className="outline-none">
      <CardHeader title="Where the denial is weak" right={<WeakPointsSummary view={view} />} />
      {analysis.findings.map((f) => {
        const added = work.fixes.includes(f.id);
        return (
          <div key={f.id} className="flex items-start gap-3 border-b border-line px-5 py-3 last:border-b-0">
            <Pill tone={f.sev === "Critical" ? "risk" : "mid"} className="mt-px">{f.sev}</Pill>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{f.title}</div>
              <div className="max-w-[80ch] text-[13px] text-muted">{f.detail}</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => onSource(f)} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-bg px-2.5 py-[3px] text-xs font-semibold text-neutral-ink hover:bg-[#E8E5DF]">
                  <Link2 size={12} className="ico" />
                  {f.source}
                </button>
                <span className="text-[13px] text-ink2">Fix: {f.fix}</span>
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

/** The six dimensions of the denial's framework (ASAM Criteria, LOCUS or CALOCUS-CASII), one compact row each. A row opens what the chart shows on it and where. */
export function FrameworkCard({ view }: { view: DenialView }) {
  const { analysis } = view;
  const [open, setOpen] = useState<{ dim: Dimension; from: HTMLElement } | null>(null);
  if (!analysis.dims.length) return null;
  return (
    <Card>
      <CardHeader title={analysis.framework.name} right={<DimensionsSummary view={view} />} />
      <ul aria-label={`${analysis.framework.name} dimensions`} className="m-0 grid list-none grid-cols-1 gap-x-6 px-3 py-2 min-[1180px]:grid-cols-2">
        {analysis.dims.map((d) => (
          <li key={d.n}>
            <button type="button" data-dim={d.n} onClick={(e) => setOpen({ dim: d, from: e.currentTarget })} className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-tile">
              <span className={cn("h-[9px] w-[9px] shrink-0 rounded-full", DOT[d.tone])} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate"><span className="text-muted tabular-nums">D{d.n}</span> {d.name}</span>
              <span className="shrink-0 text-[12px] text-muted">{DIM_TONE_WORD[d.tone]}</span>
            </button>
          </li>
        ))}
      </ul>
      {open ? <DimensionModal view={view} dim={open.dim} from={open.from} onClose={() => setOpen(null)} /> : null}
    </Card>
  );
}

/** Everything on this denial, newest first, with the flag on the right: Agent, Decision, Logged decision or Scheduled. Folded. */
export function HistoryCard({ view }: { view: DenialView }) {
  const items = useMemo(() => denialHistory(view.req, view.analysis), [view.req, view.analysis]);
  return (
    <Disclosure title="History">
      <HistoryFeed items={items} you="You" />
    </Disclosure>
  );
}
