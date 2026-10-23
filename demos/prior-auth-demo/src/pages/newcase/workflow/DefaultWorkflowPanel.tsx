import { Drawer, Pill } from "@/components/ui";
import type { Tone } from "@/data/types";
import { STAGE_LABEL, STAGES_ORDER, type StepOutcome } from "@/data/workflow/types";
import { DEFAULT_NOTE } from "./engine";
import type { CaseWorkflow } from "./model";

const WORD: Record<StepOutcome | "pending" | "ahead", string> = { done: "Done", skipped: "Skipped", failed: "Stopped", waiting: "Waiting", manual_review: "Needs a person", pending: "Pending", ahead: "Not reached" };
const TONE: Record<StepOutcome | "pending" | "ahead", Tone> = { done: "good", skipped: "neutral", failed: "risk", waiting: "mid", manual_review: "mid", pending: "neutral", ahead: "neutral" };

/** The labelled default process, read-only: its steps by stage and what happened at each on this case. The default lives in the app, not in a payer's saved workflows, so the Studio's
    canvas panel (which opens saved workflows) does not show it; this list does, with the same path. */
export function DefaultWorkflowPanel({ view, open, onClose }: { view: CaseWorkflow; open: boolean; onClose: () => void }) {
  const { workflow, run } = view;
  const step = (id: string) => [...run.steps].reverse().find((s) => s.nodeId === id);
  const stateOf = (id: string): StepOutcome | "pending" | "ahead" => step(id)?.outcome ?? (run.pending?.includes(id) ? "pending" : "ahead");
  return (
    <Drawer open={open} onClose={onClose} width={620} title={workflow.name} subtitle={<Pill tone="neutral">Illustrative default</Pill>}>
      <p className="text-[14px] text-ink2">{DEFAULT_NOTE} It follows the usual order of work, uses no payer rules and stops at a person's approval. Nothing is sent by it.</p>
      <p className="mt-3 rounded-xl bg-tile px-3.5 py-2.5 text-[13.5px]"><b>So far:</b> {run.outcomeText}</p>
      {STAGES_ORDER.map((stage) => {
        const nodes = workflow.nodes.filter((n) => n.stage === stage && n.kind !== "start");
        return nodes.length ? (
          <section key={stage} className="mt-5">
            <h3 className="font-serif text-[18px] font-semibold">{STAGE_LABEL[stage]}</h3>
            <ul className="mt-2 flex list-none flex-col gap-1.5 p-0">
              {nodes.map((n) => {
                const st = stateOf(n.id);
                const said = step(n.id)?.message;
                return (
                  <li key={n.id} className="flex items-start gap-3 rounded-xl border border-line bg-white px-3.5 py-2.5">
                    <Pill tone={TONE[st]} className="mt-0.5 shrink-0">{WORD[st]}</Pill>
                    <div className="min-w-0 text-[14px]">
                      <div className="font-medium">{n.title}</div>
                      {said ? <div className="text-[13px] text-muted">{said}</div> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null;
      })}
    </Drawer>
  );
}
