import { Target } from "lucide-react";
import { Banner, Card, CardBody, CardHeader } from "@/components/ui";
import type { BriefData } from "./lib/brief";
import type { DenialView } from "./lib/useDenialView";

export function OpeningCard({ view }: { view: DenialView }) {
  return (
    <Card>
      <CardHeader title="Your opening" subtitle="About 30 seconds. Written by Advocate, checked by Integrity." />
      <CardBody><p className="text-[15px] leading-[1.7]">{view.analysis.opening}</p></CardBody>
    </Card>
  );
}

export function PointsCard({ view }: { view: DenialView }) {
  const points = view.analysis.points;
  return (
    <Card>
      <CardHeader title={`${points.length === 3 ? "Three" : points.length} points to make`} subtitle="Each one links to the chart" />
      {points.map((p, i) => (
        <div key={p.title} className="flex items-start gap-3.5 border-b border-line px-6 py-4 last:border-b-0">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-neutral-bg text-xs font-semibold">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{p.title}</div>
            <div className="text-[13.5px] text-muted">{p.detail}</div>
            <span className="mt-1.5 inline-block rounded-full bg-neutral-bg px-2.5 py-[3px] text-xs font-semibold text-neutral-ink">{p.source}</span>
          </div>
        </div>
      ))}
    </Card>
  );
}

export function PushbackCard({ view }: { view: DenialView }) {
  return (
    <Card>
      <CardHeader title="What they may say" subtitle="And a short answer to each" />
      {view.analysis.pushback.map(([q, a]) => (
        <div key={q} className="border-b border-line px-6 py-3.5 last:border-b-0">
          <div className="font-semibold">{q}</div>
          <div className="mt-0.5 text-[13.5px] text-ink2">{a}</div>
        </div>
      ))}
    </Card>
  );
}

export function AskBanner({ view }: { view: DenialView }) {
  return (
    <Banner tone="good" icon={Target}>
      <b>The ask.</b> {view.analysis.ask}
    </Banner>
  );
}

export function DatesCard({ brief }: { brief: BriefData }) {
  const col = (title: string, rows: [string, string][]) => (
    <div>
      <div className="mb-2 text-[11.5px] font-medium tracking-[0.1em] text-muted uppercase">{title}</div>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
  return (
    <Card>
      <CardHeader title="Key dates and numbers" />
      <CardBody className="grid grid-cols-2 gap-8">
        {col("Key dates", brief.dates)}
        {col("Numbers", brief.numbers)}
      </CardBody>
    </Card>
  );
}
