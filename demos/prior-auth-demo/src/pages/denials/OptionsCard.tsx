import { CalendarPlus, FileSignature, Handshake, Scale, type LucideIcon } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Pill } from "@/components/ui";
import { band } from "@/lib/format";
import type { OptionId } from "./lib/analysis";
import type { RecommendedStep } from "./lib/step";
import type { DenialView } from "./lib/useDenialView";

/** The button for each route: the label opens the confirm dialog for it. */
export const GO: Record<OptionId, { label: string; icon: LucideIcon }> = {
  p2p: { label: "Choose a time and prepare the brief", icon: CalendarPlus },
  appeal: { label: "Draft the appeal letter", icon: FileSignature },
  accept: { label: "Accept the decision and plan the step-down", icon: Handshake },
};

/**
 * Your options, as one short row: the three routes, their chances and which one is recommended. The detail (what each needs, the radio cards, the button for a route other
 * than the recommended one) is in a right-hand panel behind "Compare the options". The block above has the primary button for the recommended route, so the main path has no extra click.
 */
export function OptionsSummary({ view, step, onCompare }: { view: DenialView; step: RecommendedStep; onCompare: (e: React.MouseEvent<HTMLElement>) => void }) {
  const { analysis } = view;
  return (
    <Card>
      <CardHeader
        title="Your options"
        subtitle={`Chance of overturning${analysis.benchmark ? ", a benchmark estimate" : `, from ${analysis.similar} similar ${analysis.ctx.payer} decisions`}`}
        right={<Button size="sm" icon={Scale} onClick={onCompare}>Compare the options</Button>}
      />
      <CardBody>
        <ul aria-label="Your options" className="m-0 grid list-none grid-cols-1 gap-x-8 gap-y-4 p-0 min-[900px]:grid-cols-3">
          {analysis.options.map((o) => {
            const b = o.chance ? band(o.chance.value) : null;
            return (
              <li key={o.id} className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="leading-snug">{o.title}</b>
                  {step.option === o.id ? <Pill tone="good">Recommended</Pill> : null}
                </div>
                <div className="mt-1 text-[13px] text-muted">
                  {o.chance && b ? <><b className="text-[14px]" style={{ color: b.color }}>{o.chance.value}%</b> · likely {o.chance.low}–{o.chance.high}% · {o.gain}</> : o.gain}
                </div>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}
