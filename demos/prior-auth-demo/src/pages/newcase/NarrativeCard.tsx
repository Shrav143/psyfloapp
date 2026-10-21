import { useState } from "react";
import { Link2, PenLine } from "lucide-react";
import { Button, Card, CardBody, CardHeader, TextArea } from "@/components/ui";
import type { NarrativeSection } from "@/data/cases";
import { slotOfSource } from "./documents";

/** The medical-necessity summary the payer will read. Editable; every source chip opens the chart page it came from. */
export function NarrativeCard({ sections, payer, onSave, onSource }: { sections: NarrativeSection[]; payer: string; onSave: (next: NarrativeSection[]) => void; onSource: (label: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState<Record<string, string>>({});

  const begin = () => {
    setText(Object.fromEntries(sections.map((s) => [s.id, s.text])));
    setEditing(true);
  };
  const save = () => {
    onSave(sections.map((s) => ({ ...s, text: text[s.id] ?? s.text })));
    setEditing(false);
  };

  return (
    <Card>
      <CardHeader
        title="Medical-necessity summary"
        subtitle={`What ${payer} will read · every statement links to the chart`}
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
            <Button size="sm" icon={PenLine} onClick={begin}>
              Edit
            </Button>
          )
        }
      />
      <CardBody className="flex flex-col gap-4 text-[15px] leading-[1.75]">
        {sections.map((s) =>
          editing ? (
            <div key={s.id}>
              <label htmlFor={`sec-${s.id}`} className="mb-1.5 block text-[13px] font-semibold">
                {s.heading}
              </label>
              <TextArea id={`sec-${s.id}`} className="min-h-[104px] text-[14.5px] leading-[1.6]" value={text[s.id] ?? ""} onChange={(e) => setText((t) => ({ ...t, [s.id]: e.target.value }))} />
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
                  className="mx-1 inline-flex items-center gap-1 rounded-full bg-neutral-bg px-2.5 py-0.5 align-baseline text-[13px] font-medium text-neutral-ink hover:bg-[#EADFD0]"
                  aria-label={`Open source: ${src}`}
                >
                  <Link2 size={12} className="ico" />
                  {src}
                </button>
              ))}
            </p>
          ),
        )}
      </CardBody>
    </Card>
  );
}
