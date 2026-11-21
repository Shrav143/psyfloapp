import { Check } from "lucide-react";
import { useStore } from "@/store";
import { StageHeading, recordsOf, type ScribeCtx } from "./shared";

/** Two steps: read the chart, then write the draft from what was said. The current one is active. */
export default function Generating({ ctx }: { ctx: ScribeCtx }) {
  const gen = useStore((s) => s.scribe.gen);
  const scribeCancel = useStore((s) => s.scribeCancel);
  const labels = recordsOf(ctx.consumer, ctx.scenario.context).map((r) => r.label);

  const step = (n: 1 | 2, text: string) => {
    const state = gen > n ? "done" : gen === n ? "active" : "wait";
    return (
      <li className={`scr-step ${state}`} aria-current={state === "active" ? "step" : undefined}>
        <span className="ico" aria-hidden="true">{state === "done" ? <Check size={14} /> : state === "active" ? <span className="p-spin" /> : null}</span>
        <span>{text}<span className="sr-only">{state === "done" ? " (done)" : state === "active" ? " (working)" : " (waiting)"}</span></span>
      </li>
    );
  };

  return (
    <div className="psy-body">
      <section className="p-card">
        <StageHeading>Writing your draft</StageHeading>
        <p className="p-sub">This takes a few seconds. Nothing is typed into the document yet.</p>
        <ul className="scr-steps" aria-live="polite" data-testid="scribe-generating">
          {step(1, `1. Reading the chart${labels.length ? `: ${labels.join(", ")}` : ""}`)}
          {step(2, "2. Writing the draft from what was said")}
        </ul>
        <button type="button" className="p-btn block scr-mt" data-testid="scribe-cancel" onClick={scribeCancel}>Cancel</button>
      </section>
    </div>
  );
}
