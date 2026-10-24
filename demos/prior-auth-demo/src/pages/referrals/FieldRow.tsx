import { useState } from "react";
import { ChevronRight, Eye, Pencil } from "lucide-react";
import { AgentBadge, Button, Dropdown, Pill, TextArea, TextInput } from "@/components/ui";
import { PROGRAM_ASAM, URGENCY_LABEL, type Evidence, type ReferralField } from "@/data/referrals";
import { PAYERS } from "@/data/seed";
import { PROGRAM_LABEL, PROGRAMS } from "@/data/types";
import { cn } from "@/lib/cn";

const URGENCY_OPTIONS = Object.values(URGENCY_LABEL).map((l) => ({ value: l, label: l }));
const PROGRAM_OPTIONS = PROGRAMS.map((p) => ({ value: `${PROGRAM_LABEL[p]} (ASAM ${PROGRAM_ASAM[p]})`, label: `${PROGRAM_LABEL[p]} (ASAM ${PROGRAM_ASAM[p]})` }));
const payerOptions = () => [...PAYERS.map((p) => ({ value: p.name, label: p.name })), { value: "None listed", label: "None listed" }];

interface Props {
  field: ReferralField;
  evidence: Evidence | null;
  selected: boolean;
  onSelect: () => void;
  onSave: (value: string) => void;
}

/** One extracted field: value, how sure Reader is, where it came from, and an inline editor. */
export function FieldRow({ field, evidence, selected, onSelect, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(field.value);
  const [why, setWhy] = useState(false);
  const missing = field.value.startsWith("Not found");
  const dot = missing || field.confidence < 75 ? "bg-risk" : field.confidence < 90 ? "bg-mid" : "bg-good";
  const startEdit = () => {
    setDraft(missing ? "" : field.value);
    setEditing(true);
    onSelect();
  };
  const save = () => {
    onSave(draft.trim());
    setEditing(false);
  };
  const editor =
    field.kind === "long" ? <TextArea aria-label={field.label} autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} />
    : field.kind === "urgency" ? <Dropdown variant="field" ariaLabel={field.label} value={draft} options={URGENCY_OPTIONS} onChange={setDraft} />
    : field.kind === "program" ? <Dropdown variant="field" ariaLabel={field.label} value={draft} options={PROGRAM_OPTIONS} onChange={setDraft} />
    : field.kind === "payer" ? <Dropdown variant="field" ariaLabel={field.label} value={draft} options={payerOptions()} onChange={setDraft} />
    : <TextInput aria-label={field.label} autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && draft.trim() && save()} />;

  return (
    <div className={cn("rounded-2xl border transition-colors", selected ? "border-forest bg-[#F3F7F4]" : "border-edge bg-white hover:bg-[#FBF8F3]")} data-field={field.key}>
      <div className="flex cursor-pointer items-start gap-3 px-4 py-2.5" onClick={onSelect}>
        <span className={cn("mt-[7px] h-2.5 w-2.5 shrink-0 rounded-full", dot)} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted">{field.label}</div>
          {editing ? (
            <div className="mt-1.5 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
              {editor}
              <div className="flex gap-2">
                <Button size="sm" variant="primary" onClick={save} disabled={!draft.trim() || draft.trim() === field.value}>Save</Button>
                <Button size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className={cn("break-words font-medium", missing && "text-muted italic")}>{field.value}</div>
          )}
          <button type="button" aria-expanded={why} onClick={(e) => { e.stopPropagation(); setWhy((w) => !w); }} className="mt-0.5 inline-flex items-center gap-1 text-[13px] font-medium text-forest hover:underline">
            <ChevronRight size={14} className={cn("ico transition-transform", why && "rotate-90")} />
            Why this value?
          </button>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-1">
            {field.edited ? (
              <Pill tone="mid">Edited by you</Pill>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-bg py-0.5 pr-2.5 pl-[3px]">
                <AgentBadge agent="reader" size={18} />
                <span className="text-xs font-semibold">Extracted by Reader</span>
              </span>
            )}
            <button type="button" aria-label={`Show ${field.label} in the document`} onClick={(e) => { e.stopPropagation(); onSelect(); }} className="grid h-7 w-7 place-items-center rounded-lg text-ink2 hover:bg-tile">
              <Eye size={15} className="ico" />
            </button>
            <button type="button" aria-label={`Edit ${field.label}`} onClick={(e) => { e.stopPropagation(); startEdit(); }} className="grid h-7 w-7 place-items-center rounded-lg text-ink2 hover:bg-tile">
              <Pencil size={15} className="ico" />
            </button>
          </div>
          <span className="text-xs text-muted">{missing ? "Not found" : `${field.confidence}% sure`}</span>
        </div>
      </div>
      {why ? (
        <div className="border-t border-line px-4 py-3 text-[13px] text-ink2">
          {missing || !evidence ? (
            <p>Reader looked through every page and did not find {field.label.toLowerCase()}.</p>
          ) : (
            <>
              <p>
                Reader found this on page {evidence.page} of the {evidence.docTitle}, in the section “{evidence.section || "Header"}”:
              </p>
              <blockquote className="mt-1.5 rounded-lg bg-tile px-3 py-2">“{evidence.quote}”</blockquote>
            </>
          )}
          <p className="mt-1.5 text-muted">{field.edited ? `Reader first read “${field.original}”. You changed it to “${field.value}”.` : missing ? "Add it by hand with the pencil." : `Confidence ${field.confidence}%. Nobody has edited it.`}</p>
        </div>
      ) : null}
    </div>
  );
}
