import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Link2, PenLine } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Chip, TextArea } from "@/components/ui";
import type { NarrativeSection } from "@/data/cases";
import { slotOfSource } from "./documents";
import { AI_DRAFT_TAG } from "./recordNarrative";

const CHIP = "mx-1 inline-flex items-center gap-1 rounded-full bg-neutral-bg px-2.5 py-0.5 align-baseline text-[13px] font-medium text-neutral-ink";

/** The medical-necessity summary the payer will read. Editable; every source chip opens the chart page it came from. */
export function NarrativeCard({ sections, editSignal, onSave, onSource, intakeId }: { sections: NarrativeSection[]; /** Counts up when "What is missing" asks for the summary to be edited. */ editSignal: number; onSave: (next: NarrativeSection[]) => void; onSource: (label: string) => void; /** The intake record the summary was drafted from: its sections link into that record and it carries the AI draft tag. */ intakeId?: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState<Record<string, string>>({});

  const begin = () => {
    setText(Object.fromEntries(sections.map((s) => [s.id, s.text])));
    setEditing(true);
  };
  useEffect(() => {
    if (editSignal === 0) return;
    begin();
    document.getElementById("summary-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
    // Only a new request from "What is missing" opens the editor.
  }, [editSignal]);
  /* A section that comes from the case page (Context added) is shown here but never part of the edit. */
  const save = () => {
    onSave(sections.filter((s) => !s.fixed).map((s) => ({ ...s, text: text[s.id] ?? s.text })));
    setEditing(false);
  };

  return (
    <Card id="summary-card">
      <CardHeader
        title="Medical-necessity summary"
        subtitle={intakeId ? `Drafted only from ${intakeId}. A clinician edits it and signs it.` : undefined}
        right={
          editing ? (
            <>
              <Button size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={save}>
                Save changes
              </Button>
            </>
          ) : (
            <>
              {intakeId ? <span data-testid="ai-draft-tag"><Chip className="border border-dashed border-edge">{AI_DRAFT_TAG}</Chip></span> : null}
              <Button size="sm" icon={PenLine} onClick={begin}>
                Edit
              </Button>
            </>
          )
        }
      />
      <CardBody className="flex flex-col gap-4 text-[14px] leading-[1.75]">
        {sections.map((s) =>
          editing && !s.fixed ? (
            <div key={s.id}>
              <label htmlFor={`sec-${s.id}`} className="mb-1.5 block text-[13px] font-semibold">
                {s.heading}
              </label>
              <TextArea id={`sec-${s.id}`} className="min-h-[104px] text-[14px] leading-[1.6]" value={text[s.id] ?? ""} onChange={(e) => setText((t) => ({ ...t, [s.id]: e.target.value }))} />
            </div>
          ) : (
            <p key={s.id}>
              <b>{s.heading}.</b> {s.text || <span className="text-risk">This section is empty.</span>}
              {s.sources.map((src) => (
                <button
                  key={src}
                  type="button"
                  disabled={!slotOfSource(src)}
                  onClick={() => onSource(src)}
                  className={`${CHIP} hover:bg-[#E8E5DF]`}
                  aria-label={`Open source: ${src}`}
                >
                  <Link2 size={12} className="ico" />
                  {src}
                </button>
              ))}
              {(s.refs ?? []).map((r) =>
                r.to ? (
                  <Link key={r.label} to={r.to} data-source-link className={`${CHIP} hover:bg-[#E8E5DF]`} aria-label={`Open source in the intake: ${r.label}`}>
                    <Link2 size={12} className="ico" />
                    {r.label}
                  </Link>
                ) : (
                  <span key={r.label} className={CHIP}>{r.label}</span>
                ),
              )}
            </p>
          ),
        )}
      </CardBody>
    </Card>
  );
}
