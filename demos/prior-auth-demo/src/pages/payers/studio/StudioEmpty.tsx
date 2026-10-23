import { LayoutTemplate, Sparkles, SquareDashed } from "lucide-react";
import { Card } from "@/components/ui";
import type { NewKind } from "./WorkflowSelector";

/* A payer with no workflow: three clear ways to start. */

const CHOICES: { kind: NewKind; icon: typeof LayoutTemplate; title: string; text: string; note: string }[] = [
  { kind: "template", icon: LayoutTemplate, title: "Start with a template", text: "Five illustrative workflows: initial authorization, concurrent review, reauthorization, retroactive and modification.", note: "Illustrative, not payer policy." },
  { kind: "blank", icon: SquareDashed, title: "Build from scratch", text: "A canvas with only Start and End. Add each step yourself.", note: "Full control, more clicks." },
  { kind: "flo", icon: Sparkles, title: "Generate with FLO", text: "Describe the payer's process in plain English and FLO drafts a workflow for you to review.", note: "Demo draft: not a live model." },
];

export function StudioEmpty({ payerName, onNew }: { payerName: string; onNew: (kind: NewKind) => void }) {
  return (
    <Card className="px-7 py-9">
      <div className="mx-auto max-w-[920px]">
        <h2 className="m-0 text-center font-serif text-[26px] leading-tight font-semibold">{payerName} has no workflow yet</h2>
        <p className="mx-auto mt-2 mb-7 max-w-[560px] text-center text-[15px] text-muted">A workflow says which steps a request goes through for this payer and what happens at each fork. Pick a way to start. Nothing is used for a real case until a person publishes it.</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {CHOICES.map((c) => (
            <button key={c.kind} type="button" onClick={() => onNew(c.kind)} className="flex flex-col items-start gap-2 rounded-[18px] border border-edge bg-white p-5 text-left transition-colors hover:border-sage hover:bg-[#FBF8F3]">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-sage-bg text-forest"><c.icon size={20} className="ico" aria-hidden="true" /></span>
              <span className="font-serif text-[19px] font-semibold">{c.title}</span>
              <span className="text-[13.5px] text-ink2">{c.text}</span>
              <span className="mt-auto pt-1 text-xs text-muted">{c.note}</span>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
