import { ClipboardCheck, Copy, Printer } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Checkbox, Disclosure, KeyValue, Label, Pill } from "@/components/ui";
import { band } from "@/lib/format";
import type { BriefData } from "./lib/brief";
import type { DenialView } from "./lib/useDenialView";
import { useStore } from "@/store";

export function CallDetailsCard({ view, brief, onBook }: { view: DenialView; brief: BriefData; onBook: () => void }) {
  const booked = !!view.work.slot;
  return (
    <Card>
      <CardHeader title="Call details" />
      <CardBody className="flex flex-col gap-4">
        <KeyValue className="grid-cols-[96px_1fr]" items={[
          ["Payer", brief.payerName],
          ["Who to call", brief.line],
          ["Reviewer", brief.reviewer],
          ["Window", brief.window],
          ["Closes in", <span key="c" className={brief.closesTone === "risk" ? "text-risk-ink" : brief.closesTone === "mid" ? "text-mid-ink" : undefined}>{brief.closesIn}</span>],
          ["Dial-in", "On the denial letter"],
        ]} />
        <div className="print:hidden"><Button variant={booked ? "outline" : "primary"} onClick={onBook}>{booked ? "Change the call time" : "Book the call"}</Button></div>
      </CardBody>
    </Card>
  );
}

export function ChanceCard({ view }: { view: DenialView }) {
  const [p2p, appeal] = view.analysis.options;
  if (!p2p.chance || !appeal.chance) return null;
  const b = band(p2p.chance.value);
  return (
    <Card>
      <CardBody className="flex flex-col gap-1.5">
        <Label>Chance of overturning</Label>
        <div className="flex items-baseline gap-3">
          <b className="text-[32px]" style={{ color: b.color }}>{p2p.chance.value}%</b>
          <span className="text-muted">likely {p2p.chance.low}–{p2p.chance.high}%</span>
          <Pill tone={b.tone}>{b.word}</Pill>
        </div>
        <div className="text-[13px] text-muted">{view.analysis.benchmark ? "Benchmark estimate" : `From ${view.analysis.similar} similar ${view.analysis.ctx.payer} decisions`}. A written appeal is {appeal.chance.value}%.</div>
      </CardBody>
    </Card>
  );
}

/** Folded: the documents to have open during the call. The closed line counts the ones already ticked. */
export function OpenDocsCard({ view, brief }: { view: DenialView; brief: BriefData }) {
  const toggle = useStore((s) => s.toggleBriefDoc);
  const ticked = brief.docs.filter((d) => view.work.ticked.includes(d)).length;
  return (
    <Disclosure title="Have these open" summary={`${ticked} of ${brief.docs.length} ticked`} keepMounted className="psy-print-open">
      {brief.docs.map((d) => (
        <div key={d} className="border-b border-line px-6 py-2.5 last:border-b-0">
          <Checkbox checked={view.work.ticked.includes(d)} onChange={() => toggle(view.req.id, d)} label={d} />
        </div>
      ))}
    </Disclosure>
  );
}

export function BriefActions({ onCopy, onPrint, onOutcome }: { onCopy: () => void; onPrint: () => void; onOutcome: () => void }) {
  return (
    <Card className="print:hidden">
      <CardBody className="flex flex-col gap-2.5">
        <Button icon={Copy} onClick={onCopy}>Copy brief</Button>
        <Button icon={Printer} onClick={onPrint}>Print</Button>
        <Button variant="primary" icon={ClipboardCheck} onClick={onOutcome}>Record the call outcome</Button>
      </CardBody>
    </Card>
  );
}
