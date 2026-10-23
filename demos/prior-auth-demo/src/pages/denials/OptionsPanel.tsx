import { useState, type RefObject } from "react";
import { FileText } from "lucide-react";
import { Button, ChoiceCard, Drawer, Pill } from "@/components/ui";
import { band } from "@/lib/format";
import { useStore } from "@/store";
import type { DenialOption, OptionId } from "./lib/analysis";
import type { RecommendedStep } from "./lib/step";
import { useDialogFocus } from "./lib/useDialogFocus";
import type { DenialView } from "./lib/useDenialView";
import { GO } from "./OptionsCard";

function Chance({ o, benchmark, similar }: { o: DenialOption; benchmark: boolean; similar: number }) {
  if (!o.chance) return null;
  const b = band(o.chance.value);
  return (
    <div className="text-right">
      <b className="text-[18px]" style={{ color: b.color }}>{o.chance.value}%</b>
      <div className="text-xs text-muted">likely {o.chance.low}–{o.chance.high}%</div>
      <div className="text-xs text-muted">{benchmark ? "Benchmark estimate" : `${similar} similar decisions`}</div>
    </div>
  );
}

function Cards({ view, recommended, selected, onPick, from }: { view: DenialView; recommended: OptionId | null; selected: OptionId | null; onPick: (o: DenialOption) => void; from: RefObject<HTMLElement | null> }) {
  const { analysis } = view;
  const ref = useDialogFocus(from, ["[role=radio][aria-checked=true]", "[role=radio]"]);
  return (
    <div ref={ref} tabIndex={-1} role="radiogroup" aria-label="Next step" className="flex flex-col gap-3 outline-none">
      {analysis.options.map((o) => (
        <ChoiceCard key={o.id} selected={selected === o.id} onClick={() => onPick(o)} title={<span className="flex items-center gap-2">{o.title}{recommended === o.id ? <Pill tone="good">Recommended</Pill> : null}</span>} right={<Chance o={o} benchmark={analysis.benchmark} similar={analysis.similar} />}>
          <span className="block">{o.summary}</span>
          <span className="mt-1.5 block text-xs">Needs: {o.needs.join(" · ")}</span>
        </ChoiceCard>
      ))}
    </div>
  );
}

/**
 * The three routes as radio cards with their chances and what each needs, in a right-hand panel. The recommended step's route is selected; picking another and pressing its button
 * closes the panel and opens the confirm dialog for that route. A route that does not exist for the denial (the call window has closed) says so and cannot be picked.
 */
export function OptionsPanel({ view, step, from, onChoose, onClose }: { view: DenialView; step: RecommendedStep; from: RefObject<HTMLElement | null>; onChoose: (id: OptionId) => void; onClose: () => void }) {
  const { analysis, req, clock } = view;
  const toast = useStore((s) => s.toast);
  const [picked, setPicked] = useState<OptionId | null>(null);
  const selected = picked ?? step.option;
  const windowClosed = req.deadlineAt !== undefined && req.clockSub === "peer-to-peer window" && req.deadlineAt - clock <= 0;
  const pick = (o: DenialOption) => {
    if (o.id === "p2p" && windowClosed) {
      toast({ title: "The peer-to-peer window has closed", body: "A written appeal is still open.", tone: "mid" });
      return;
    }
    setPicked(o.id);
  };
  const go = selected ? GO[selected] : null;
  const booked = req.chip === "Call booked";
  return (
    <Drawer
      open
      onClose={onClose}
      width={560}
      title="Your options"
      subtitle={`${req.id}. Chance of overturning${analysis.benchmark ? ", a benchmark estimate" : `, from ${analysis.similar} similar ${analysis.ctx.payer} decisions`}`}
      footer={
        <div className="flex flex-wrap items-center gap-2.5">
          {go && selected ? <Button variant="primary" icon={go.icon} onClick={() => onChoose(selected)}>{go.label}</Button> : <span className="text-[13px] text-muted">Pick a route to go on. Nothing is sent until a clinician signs.</span>}
          {booked ? <span className="inline-flex items-center gap-1.5 text-[13px] text-muted"><FileText size={14} className="ico" />A call is already booked. Choosing again changes it.</span> : null}
        </div>
      }
    >
      <Cards view={view} recommended={step.option} selected={selected} onPick={pick} from={from} />
    </Drawer>
  );
}
