import { Check } from "lucide-react";
import { AgentBadge, Spinner } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import type { RunState } from "@/data/caseModel";
import type { AgentKey } from "@/data/types";

interface Step { agent: AgentKey; lines: string[]; done: string }

/** The strip above the cards while the agents apply the selected actions (about 8 seconds). */
export function WorkStrip({ run, sections, similar }: { run: RunState; sections: number; similar: number }) {
  const steps: Step[] = [
    { agent: "scribe", lines: ["Reading your answers", "Writing the new sentences into the draft", `Rewriting ${sections} ${sections === 1 ? "section" : "sections"}`], done: "Draft updated" },
    { agent: "integrity", lines: ["Reading every sentence against the chart", "Checking dates and identifiers"], done: "Every sentence matches the chart" },
    { agent: "forecaster", lines: [`Matching ${similar.toLocaleString("en-US")} similar decisions`, "Re-scoring the approval chance"], done: "New chance ready" },
  ];
  return (
    <div role="status" aria-live="polite" className="psy-fade-up rounded-[20px] border border-forest/30 bg-[#F3F7F4] px-5 py-4">
      <div className="mb-2 text-sm font-semibold">The agents are updating the draft <span className="font-normal text-muted">· about 8 seconds</span></div>
      {steps.map((s, i) => {
        const state = run.stage > i ? "done" : run.stage === i ? "working" : "waiting";
        return (
          <div key={s.agent} className="flex items-center gap-3 py-1.5">
            <AgentBadge agent={s.agent} size={26} />
            <span className="w-24 font-semibold">{AGENTS[s.agent].name}</span>
            <span className={state === "waiting" ? "flex-1 text-[13px] text-muted" : "flex-1 text-[13px] text-ink2"}>{state === "done" ? s.done : state === "working" ? s.lines[Math.min(run.sub, s.lines.length - 1)] : "Waiting"}</span>
            {state === "done" ? <Check size={18} className="ico text-good" aria-label="Done" /> : state === "working" ? <Spinner /> : <span className="h-2 w-2 rounded-full bg-[#D9D0C3]" />}
          </div>
        );
      })}
    </div>
  );
}
