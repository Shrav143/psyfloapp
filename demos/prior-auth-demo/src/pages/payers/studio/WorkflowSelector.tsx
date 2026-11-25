import { useEffect, useId, useRef, useState } from "react";
import { Archive, Check, ChevronDown, Copy, Info, SlidersHorizontal, FilePlus2, History, LayoutTemplate, Play, Rocket, Save, Sparkles, SquareDashed } from "lucide-react";
import { Button, Pill, useEscape } from "@/components/ui";
import { REQUEST_TYPE_LABEL, type Workflow } from "@/data/workflow/types";
import { cn } from "@/lib/cn";
import { MenuButton } from "./Menu";
import { STATUS_TONE, STATUS_WORD } from "./lib/ui";

/* The bar above the canvas: which workflow, and what can be done with it. Everything else about the workflow is in Details below. */

export type NewKind = "template" | "blank" | "flo";

export interface WorkflowSelectorProps {
  workflows: Workflow[];
  current?: Workflow;
  dirty: boolean;
  /** The text under the bar's buttons: where the changes live. */
  savedNote: string;
  onSelect: (id: string) => void;
  onNew: (kind: NewKind) => void;
  onDuplicate: () => void;
  onSave: () => void;
  onTest: () => void;
  onPublish: () => void;
  onArchive: () => void;
  onHistory: () => void;
  saveDisabled?: boolean;
  /** An archived workflow can be read but not changed or published. */
  locked?: boolean;
  /** The workflow's own facts in one line, shown under the buttons. */
  summary: string;
  detailsOpen: boolean;
  onDetails: () => void;
  /** One short notice at most: a conflict, or "edits make a draft of the next version". */
  notice?: { tone: "mid" | "neutral"; title?: string; text: string };
}

const requestOf = (w: Workflow): string => (w.requestType === "any" ? "Any request" : REQUEST_TYPE_LABEL[w.requestType]);

export function WorkflowSelector({ workflows, current, dirty, savedNote, onSelect, onNew, onDuplicate, onSave, onTest, onPublish, onArchive, onHistory, saveDisabled, locked, summary, detailsOpen, onDetails, notice }: WorkflowSelectorProps) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-edge bg-white">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 px-4 pt-3 pb-1.5">
      <WorkflowPicker workflows={workflows} current={current} onSelect={onSelect} />
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <MenuButton
          label="New"
          icon={FilePlus2}
          items={[
            { id: "template", label: "From a template", hint: "Five illustrative starting points", icon: LayoutTemplate, onPick: () => onNew("template") },
            { id: "blank", label: "Blank", hint: "Start and End only", icon: SquareDashed, onPick: () => onNew("blank") },
            { id: "flo", label: "Generate with FLO", hint: "A demo draft from a description", icon: Sparkles, onPick: () => onNew("flo") },
          ]}
        />
        <Button icon={Save} variant={dirty ? "primary" : "outline"} onClick={onSave} disabled={saveDisabled || locked || !current}>Save draft</Button>
        <Button icon={Play} onClick={onTest} disabled={!current}>Test</Button>
        <Button icon={Rocket} variant={dirty ? "outline" : "primary"} onClick={onPublish} disabled={!current || locked}>Publish</Button>
        <MenuButton
          label="More"
          ariaLabel="More actions for this workflow"
          items={[
            { id: "dup", label: "Duplicate", hint: "A new draft with the same steps", icon: Copy, disabled: !current, onPick: onDuplicate },
            { id: "history", label: "Version history", hint: "Earlier versions and who saved them", icon: History, disabled: !current, onPick: onHistory },
            { id: "archive", label: "Archive", hint: "Retire it. It stops being used for new cases", icon: Archive, danger: true, disabled: !current || current.status === "archived", onPick: onArchive },
          ]}
        />
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-3 text-[13px] text-muted">
      <span className="min-w-0 text-ink2">{summary}</span>
      <span className="ml-auto flex items-center gap-3">
        <span>
          <span className={cn(dirty && "font-semibold text-mid-ink")}>{dirty ? "Unsaved changes. " : ""}</span>
          {savedNote}
        </span>
        <button type="button" onClick={onDetails} aria-expanded={detailsOpen} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold text-forest hover:bg-sage-bg">
          <SlidersHorizontal size={14} className="ico" aria-hidden="true" />
          Details
          <ChevronDown size={14} className={cn("ico transition-transform", detailsOpen && "rotate-180")} aria-hidden="true" />
        </button>
      </span>
    </div>
    {notice ? (
      <div role="note" className={cn("flex items-start gap-2.5 border-t px-4 py-2.5 text-[13px]", notice.tone === "mid" ? "border-mid-edge bg-mid-bg text-mid-ink" : "border-line bg-tile text-ink2")}>
        <Info size={16} className="ico mt-0.5" aria-hidden="true" />
        <span>{notice.title ? <span className="font-semibold">{notice.title}. </span> : null}{notice.text}</span>
      </div>
    ) : null}
    </div>
  );
}

function WorkflowPicker({ workflows, current, onSelect }: { workflows: Workflow[]; current?: Workflow; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEscape(open, () => setOpen(false));
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, [open]);

  return (
    <div ref={ref} className="relative min-w-0 max-w-full">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-controls={id} aria-label={`Workflow: ${current?.name ?? "none chosen"}. Change workflow`} onClick={() => setOpen((o) => !o)} className="flex h-[46px] min-w-0 max-w-full items-center gap-2.5 rounded-xl border border-field bg-white px-3.5 text-left hover:bg-tile">
        <span className="min-w-0">
          <span className="block max-w-[300px] truncate font-serif text-[16px] leading-tight font-semibold">{current?.name ?? "Choose a workflow"}</span>
          {current ? <span className="block text-xs leading-tight text-muted">{requestOf(current)} · version {current.version}</span> : null}
        </span>
        {current ? <Pill tone={STATUS_TONE[current.status]} dot>{STATUS_WORD[current.status]}</Pill> : null}
        <ChevronDown size={16} className={cn("ico shrink-0 text-faint transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open ? (
        <div id={id} role="listbox" aria-label="Workflows for this payer" className="psy-fade-up absolute top-[52px] left-0 z-40 max-h-[380px] w-[440px] max-w-[calc(100vw-48px)] overflow-auto rounded-[14px] border border-field bg-white p-1.5 shadow-[0_12px_32px_rgba(21,27,36,0.12)]">
          {workflows.length === 0 ? <p className="m-0 px-3 py-4 text-sm text-muted">This payer has no workflow yet.</p> : null}
          {workflows.map((w) => (
            <button
              key={w.id}
              type="button"
              role="option"
              aria-selected={w.id === current?.id}
              onClick={() => {
                setOpen(false);
                onSelect(w.id);
              }}
              className={cn("flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left hover:bg-tile", w.id === current?.id && "bg-[#EEF7F6]")}
            >
              <span className="grid w-4 place-items-center text-forest">{w.id === current?.id ? <Check size={16} className="ico" aria-hidden="true" /> : null}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{w.name}</span>
                <span className="block text-xs text-muted">{requestOf(w)} · version {w.version}</span>
              </span>
              <Pill tone={STATUS_TONE[w.status]} dot>{STATUS_WORD[w.status]}</Pill>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
