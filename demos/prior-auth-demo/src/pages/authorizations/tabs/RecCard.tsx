import { useState } from "react";
import { ArrowRight, Check, ChevronDown, ChevronRight, ExternalLink, X } from "lucide-react";
import { Link } from "react-router-dom";
import { AgentBadge, Button, Field, Pill, TextArea } from "@/components/ui";
import type { Rec } from "@/data/caseDetail";
import { gainOf } from "@/data/caseModel";
import { AGENTS } from "@/data/agents";
import { cn } from "@/lib/cn";

/** A checkbox without the kit's label wrapper: with the wrapper, a click on the tick icon fires twice and cancels itself. */
function Tick({ checked, disabled, onChange, title }: { checked: boolean; disabled: boolean; onChange: () => void; title: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-start gap-2.5">
      <button
        type="button" role="checkbox" aria-checked={checked} aria-label={`Include "${title}" in the draft`} disabled={disabled} onClick={onChange}
        className={cn("mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px] disabled:opacity-60", checked ? "border-forest bg-forest text-white" : "border-[#D9D0C3] bg-white")}
      >
        {checked ? <Check size={12} className="ico pointer-events-none" /> : null}
      </button>
      <span className={cn("text-[15px] font-semibold", !disabled && "cursor-pointer")} onClick={disabled ? undefined : onChange}>{title}</span>
    </div>
  );
}

interface Props {
  rec: Rec;
  selected: boolean;
  answer: string;
  note?: string;
  focus: boolean;
  showError: boolean;
  disabled: boolean;
  onToggle: () => void;
  onAnswer: (v: string) => void;
  onSendNote: (v: string) => void;
  onDismiss: () => void;
}

/** One recommendation: checkbox, title, chips, up to three bullets, a "Why this matters" expander and a note box. */
export function RecCard({ rec, selected, answer, note, focus, showError, disabled, onToggle, onAnswer, onSendNote, onDismiss }: Props) {
  const [why, setWhy] = useState(false);
  const [noting, setNoting] = useState(false);
  const [draft, setDraft] = useState("");
  const answered = answer.trim().length > 0;
  const agent = AGENTS[rec.agent].name;
  return (
    <div id={`rec-${rec.id}`} data-testid={`rec-${rec.id}`} className={cn("rounded-[20px] border p-5 transition-colors", selected ? "border-[#BFD3CA] bg-[#F8FAF8]" : "border-edge bg-white", focus && "outline-2 outline-offset-2 outline-forest")}>
      <div className="flex items-start gap-3">
        <Tick checked={selected} disabled={disabled} onChange={onToggle} title={rec.title} />
        {rec.input ? (answered ? <Pill tone="good">Answer added</Pill> : <Pill tone="mid">Needs your input</Pill>) : null}
        <Pill tone="good">+{gainOf(rec)} pts</Pill>
      </div>
      <ul className="mt-2.5 ml-[30px] flex flex-col gap-1.5">
        {rec.bullets.map((b) => (
          <li key={b} className="flex items-start gap-2.5">
            <ArrowRight size={14} className="ico mt-[5px] text-muted" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2.5 ml-[30px]">
        <button type="button" onClick={() => setWhy(!why)} aria-expanded={why} className="flex items-center gap-1 text-[13px] font-medium text-forest">
          {why ? <ChevronDown size={14} className="ico" /> : <ChevronRight size={14} className="ico" />}
          Why this matters
        </button>
        {why ? <div className="mt-2 rounded-xl bg-tile px-3.5 py-2.5 text-[13.5px] text-ink2">{rec.why}</div> : null}

        {rec.input ? (
          <div className="mt-3">
            <Field label={rec.input.label} required error={showError && !answered ? `Type your answer before ${agent} can apply this.` : undefined}>
              <TextArea rows={2} className="min-h-14!" value={answer} disabled={disabled} onChange={(e) => onAnswer(e.target.value)} placeholder={rec.input.placeholder} />
            </Field>
            <div className="mt-2 flex items-center gap-2">
              <Button size="sm" disabled={!answered || disabled} onClick={() => onSendNote(answer.trim())}>Send note</Button>
              <span className="text-xs text-muted">{note ? `Note sent to ${agent}.` : `${agent} uses your answer in the draft.`}</span>
            </div>
          </div>
        ) : null}

        {noting && !rec.input ? (
          <div className="mt-3">
            <TextArea rows={2} className="min-h-14!" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add context or a note for the agent…" aria-label={`Note for ${agent}`} />
            <div className="mt-2 flex gap-2">
              <Button size="sm" disabled={!draft.trim()} onClick={() => { onSendNote(draft.trim()); setNoting(false); setDraft(""); }}>Send note</Button>
              <Button size="sm" variant="ghost" onClick={() => setNoting(false)}>Cancel</Button>
            </div>
          </div>
        ) : null}
        {note && !rec.input ? <div className="mt-2 text-xs text-muted">Note sent to {agent}: “{note}”</div> : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <AgentBadge agent={rec.agent} size={20} />
          <span className="text-xs text-muted">{agent} does this</span>
          {rec.link ? <Link to={rec.link.to} className="ml-2 inline-flex items-center gap-1 text-[13px] font-medium text-forest hover:underline">{rec.link.label}<ExternalLink size={12} className="ico" /></Link> : null}
          <span className="flex-1" />
          {!rec.input && !noting ? <Button size="sm" variant="ghost" onClick={() => setNoting(true)}>Add a note</Button> : null}
          <Button size="sm" variant="ghost" icon={X} onClick={onDismiss} disabled={disabled} className="!text-muted">Dismiss</Button>
        </div>
      </div>
    </div>
  );
}
