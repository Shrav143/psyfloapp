import { useState } from "react";
import { CalendarPlus, FileSignature, FileText, Handshake } from "lucide-react";
import { Button, Card, CardBody, CardHeader, ChoiceCard, Pill } from "@/components/ui";
import { band } from "@/lib/format";
import { useStore } from "@/store";
import type { DenialOption, OptionId } from "./lib/analysis";
import type { DenialView } from "./lib/useDenialView";

function Chance({ o, benchmark, similar }: { o: DenialOption; benchmark: boolean; similar: number }) {
  if (!o.chance) return null;
  const b = band(o.chance.value);
  return (
    <div className="text-right">
      <b className="text-xl" style={{ color: b.color }}>{o.chance.value}%</b>
      <div className="text-xs text-muted">likely {o.chance.low}–{o.chance.high}%</div>
      <div className="text-xs text-muted">{benchmark ? "Benchmark estimate" : `${similar} similar decisions`}</div>
    </div>
  );
}

/** Three next steps as radio cards. The button below is the confirm gate: it opens the dialog for the chosen step. */
export function OptionsCard({ view, onChoose }: { view: DenialView; onChoose: (id: OptionId) => void }) {
  const { analysis, req, clock } = view;
  const toast = useStore((s) => s.toast);
  const [picked, setPicked] = useState<OptionId | null>(null);
  const selected = picked ?? analysis.recommended;
  const windowClosed = req.deadlineAt !== undefined && req.clockSub === "peer-to-peer window" && req.deadlineAt - clock <= 0;
  const select = (o: DenialOption) => {
    if (o.id === "p2p" && windowClosed) {
      toast({ title: "The peer-to-peer window has closed", body: "A written appeal is still open.", tone: "mid" });
      return;
    }
    setPicked(o.id);
  };
  const go = { p2p: { label: "Choose a time and prepare the brief", icon: CalendarPlus }, appeal: { label: "Draft the appeal letter", icon: FileSignature }, accept: { label: "Accept the decision and plan the step-down", icon: Handshake } }[selected];
  return (
    <Card>
      <CardHeader title="Your options" subtitle={`Chance of overturning${analysis.benchmark ? ", a benchmark estimate" : `, from ${analysis.similar} similar ${analysis.ctx.payer} decisions`}`} />
      <CardBody className="flex flex-col gap-3" >
        <div role="radiogroup" aria-label="Next step" className="flex flex-col gap-3">
          {analysis.options.map((o) => (
            <ChoiceCard key={o.id} selected={selected === o.id} onClick={() => select(o)} title={<span className="flex items-center gap-2">{o.title}{analysis.recommended === o.id ? <Pill tone="good">Recommended</Pill> : null}</span>} right={<Chance o={o} benchmark={analysis.benchmark} similar={analysis.similar} />}>
              <span className="block">{o.summary}</span>
              <span className="mt-1.5 block text-xs">Needs: {o.needs.join(" · ")}</span>
            </ChoiceCard>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <Button variant="primary" icon={go.icon} onClick={() => onChoose(selected)}>{go.label}</Button>
          {req.chip === "Call booked" ? <span className="inline-flex items-center gap-1.5 text-[13px] text-muted"><FileText size={14} className="ico" />A call is already booked. Choosing again changes it.</span> : null}
        </div>
      </CardBody>
    </Card>
  );
}
