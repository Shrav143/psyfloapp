import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { AgentChip, Button, Pill, TextArea } from "@/components/ui";
import type { InstrumentEvidence, ModuleId } from "@/data/assess/types";
import type { IntakeRecord } from "@/data/intake/types";
import { useStore } from "@/store";
import { SimulatedTag, SourceLink } from "../shared/provenance";

/** One piece of evidence the simulated reader proposed for a field. It is a draft: nothing is written to the field until a person accepts it, edits it or
    rejects it. The source opens the document with the sentence highlighted. */
export function EvidenceCard({ record, moduleId, evidence: ev, fieldLabel, hasValue }: { record: IntakeRecord; moduleId: ModuleId; evidence: InstrumentEvidence; fieldLabel: string; hasValue: boolean }) {
  const decide = useStore((s) => s.decideInstrumentEvidence);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(ev.text);
  return (
    <div data-evidence={ev.id} className="rounded-xl border border-mid-edge bg-mid-bg/50 px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <AgentChip agent={ev.agent} />
        <SimulatedTag what="Simulated evidence reader" />
        <Pill tone="mid">Draft · AI suggested</Pill>
        <Pill tone={ev.confidence === "high" ? "good" : ev.confidence === "medium" ? "mid" : "risk"}>Confidence: {ev.confidence}</Pill>
      </div>
      {editing ? (
        <TextArea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} aria-label={`Edit the suggestion for ${fieldLabel}`} className="mt-2" />
      ) : (
        <p className="mt-2 text-[14px] whitespace-pre-line">{ev.text}</p>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <SourceLink record={record} source={ev.source} />
        <span className="text-[12px] text-muted">{ev.explanation}</span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {editing ? (
          <>
            <Button size="sm" variant="primary" icon={Check} onClick={() => { decide(record.id, moduleId, ev.id, "edited", draft); setEditing(false); }}>{hasValue ? "Save edit and add" : "Save edit and accept"}</Button>
            <Button size="sm" onClick={() => { setEditing(false); setDraft(ev.text); }}>Cancel</Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="primary" icon={Check} onClick={() => decide(record.id, moduleId, ev.id, "accepted")}>{hasValue ? "Add to the field" : "Accept"}</Button>
            <Button size="sm" icon={Pencil} onClick={() => setEditing(true)}>Edit</Button>
            <Button size="sm" icon={X} onClick={() => decide(record.id, moduleId, ev.id, "rejected")}>Reject</Button>
          </>
        )}
      </div>
    </div>
  );
}
