import { useState } from "react";
import { Button, Field, TextArea } from "@/components/ui";
import type { CansAssessment, IntakeRecord, SourceRef } from "@/data/intake/types";
import { useStore } from "@/store";
import { CANS_THEMES, type CansTheme } from "./cansModel";
import { ItemSelect } from "./ItemSelect";
import { domainOfItem } from "./template";
import { Select } from "./ui";

/** Staff add a piece of evidence by hand: the statement, where it belongs (an item of the loaded template, or a Psyflo theme when none is loaded) and where it comes from. */
export function AddEvidence({ record, cans, onDone }: { record: IntakeRecord; cans: CansAssessment; onDone: () => void }) {
  const add = useStore((s) => s.addCansEvidence);
  const [text, setText] = useState("");
  const [theme, setTheme] = useState<CansTheme>("Functioning");
  const [itemId, setItemId] = useState(cans.items[0]?.id ?? "");
  const sources: { value: string; label: string; src: SourceRef }[] = [
    { value: "staff", label: "Staff observation", src: { kind: "staff", ref: "Staff observation" } },
    { value: "assessment", label: "Clinical assessment", src: { kind: "staff", ref: "Clinical assessment" } },
    ...record.documents.map((d) => ({ value: d.id, label: d.name, src: { kind: "document" as const, ref: d.name.replace(/\.(pdf|txt)$/i, ""), docId: d.id } })),
  ];
  const [source, setSource] = useState("staff");
  const templated = !!cans.template && cans.items.length > 0;
  const save = () => {
    const src = sources.find((s) => s.value === source)?.src ?? sources[0].src;
    const t = templated ? (domainOfItem(itemId)?.theme ?? "Other") : theme;
    add(record.id, { text: text.trim(), theme: t, source: src, itemId: templated ? itemId : undefined });
    setText("");
    onDone();
  };
  return (
    <div data-add-evidence className="space-y-3 rounded-xl border border-line bg-tile px-3.5 py-3">
      <Field label="Evidence">
        <TextArea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="What the record or the person says, in plain words" />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {templated ? (
          <Field label="Assessment item"><ItemSelect cans={cans} value={itemId} onChange={setItemId} label="Assessment item" /></Field>
        ) : (
          <Field label="Theme"><Select label="Theme" value={theme} onChange={(v) => setTheme(v as CansTheme)} options={CANS_THEMES.map((t) => ({ value: t, label: t }))} /></Field>
        )}
        <Field label="Source"><Select label="Source" value={source} onChange={setSource} options={sources.map(({ value, label }) => ({ value, label }))} /></Field>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="primary" disabled={!text.trim()} onClick={save}>Add evidence</Button>
        <Button size="sm" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}
