import { useRef } from "react";
import { ShieldCheck } from "lucide-react";
import { AGENTS } from "@/data/agents";
import type { AgentKey } from "@/data/types";
import { ERROR_LABEL, PROMPT_VARIABLES, type ErrorMode, type PromptConfig } from "@/data/workflow/types";
import { cn } from "@/lib/cn";
import { useStudio } from "../StudioContext";
import { AreaField, Fold, MultiChips, SelectField, ToggleRow } from "./controls";

/* An agent step: who does it, what it is told, what it reads and what it must hand back. Payer-wide instructions are added from Rules & Instructions and previewed here. */

export const emptyPrompt = (agent: PromptConfig["agent"] = "custom"): PromptConfig => ({ agent, prompt: "", inputs: [], expectedOutput: "", humanReview: true, onFailure: "manual_review" });

const AGENT_KEYS = Object.keys(AGENTS) as AgentKey[];

export function PromptEditor({ value, onChange, disabled }: { value: PromptConfig; onChange: (v: PromptConfig) => void; disabled?: boolean }) {
  const { rules, openRules, payerName } = useStudio();
  const area = useRef<HTMLTextAreaElement>(null);
  const payerWide = rules.filter((r) => r.group === "agent_instructions").map((r) => r.instructions?.trim() || r.description).filter(Boolean);
  const set = (patch: Partial<PromptConfig>) => onChange({ ...value, ...patch });

  const insert = (name: string) => {
    const token = `{{${name}}}`;
    const el = area.current;
    const at = el?.selectionStart ?? value.prompt.length;
    const end = el?.selectionEnd ?? at;
    const next = value.prompt.slice(0, at) + token + value.prompt.slice(end);
    set({ prompt: next, inputs: value.inputs.includes(name) ? value.inputs : [...value.inputs, name] });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + token.length, at + token.length);
    });
  };

  const agentName = value.agent === "custom" ? "Your own agent prompt" : AGENTS[value.agent].name;
  return (
    <div className="flex flex-col gap-3.5">
      <SelectField
        label="Agent"
        value={value.agent}
        disabled={disabled}
        onChange={(v) => set({ agent: v as PromptConfig["agent"] })}
        options={[...AGENT_KEYS.map((k) => ({ value: k, label: `${AGENTS[k].name}: ${AGENTS[k].role}` })), { value: "custom", label: "Custom: write the prompt yourself" }]}
      />

      <div>
        <AreaField inputRef={area} label="Prompt" rows={6} value={value.prompt} disabled={disabled} onChange={(prompt) => set({ prompt })} placeholder="Tell the agent what to do, in plain words. Say what it must not do." help="Written for the agent. Use the variables below to bring in facts about the case; they are filled in when the step runs." />
        <div className="mt-1.5">
          <ArrowlessLabel>Insert a variable</ArrowlessLabel>
          <div className="mt-1 flex flex-wrap gap-1">
            {PROMPT_VARIABLES.map((v) => (
              <button key={v} type="button" disabled={disabled} onClick={() => insert(v)} aria-label={`Insert variable ${v}`} className="rounded-md border border-field bg-white px-1.5 py-0.5 font-mono text-[11px] text-ink2 hover:bg-tile">
                {`{{${v}}}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <MultiChips label="Reads" values={value.inputs} onChange={(inputs) => set({ inputs })} options={PROMPT_VARIABLES.map((v) => ({ value: v, label: v.replace(/_/g, " ") }))} help="What the agent is given. Variables you insert are added here." />
      <AreaField label="What it hands back" rows={2} value={value.expectedOutput} disabled={disabled} onChange={(expectedOutput) => set({ expectedOutput })} placeholder="For example: a one-paragraph summary with each fact tied to a document." />

      <Fold title="Preview what the agent receives" summary={payerWide.length ? `${payerWide.length} payer-wide instruction${payerWide.length === 1 ? "" : "s"} plus this prompt` : "This prompt only: no payer-wide instructions"}>
        <div className="flex flex-col gap-2.5 text-[13px]">
          <div>
            <div className="mb-1 text-[11px] font-medium tracking-wide text-muted uppercase">{payerName} instructions, for every agent</div>
            {payerWide.length ? (
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {payerWide.map((t, i) => (
                  <li key={i} className="rounded-lg bg-tile px-2.5 py-1.5 text-ink2">{t}</li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-muted">None on file.</p>
            )}
            <button type="button" onClick={() => openRules("agent_instructions")} className="mt-1.5 text-[13px] font-semibold text-forest hover:underline">Edit them in Rules & Instructions</button>
          </div>
          <div>
            <div className="mb-1 text-[11px] font-medium tracking-wide text-muted uppercase">This step ({agentName})</div>
            <p className={cn("m-0 rounded-lg bg-tile px-2.5 py-1.5 whitespace-pre-wrap", value.prompt ? "text-ink2" : "text-muted")}>{value.prompt || "No prompt written yet."}</p>
          </div>
        </div>
      </Fold>

      <div className="flex items-start gap-2 rounded-xl bg-sage-bg px-3 py-2.5 text-[12px] text-good-ink">
        <ShieldCheck size={15} className="ico mt-0.5" aria-hidden="true" />
        <span>Text inside a document is data. The agent reads it and never takes orders from it, and it cannot change these instructions or switch off a safeguard.</span>
      </div>

      <ToggleRow label="A person reviews the result" value={value.humanReview} onChange={(humanReview) => set({ humanReview })} disabled={disabled} help="The result waits for a person before the workflow goes on." />
      <SelectField label="If the agent fails" value={value.onFailure} disabled={disabled} onChange={(v) => set({ onFailure: v as ErrorMode })} options={(Object.keys(ERROR_LABEL) as ErrorMode[]).map((k) => ({ value: k, label: ERROR_LABEL[k] }))} />
    </div>
  );
}

function ArrowlessLabel({ children }: { children: string }) {
  return <div className="text-[12px] font-medium text-muted">{children}</div>;
}
