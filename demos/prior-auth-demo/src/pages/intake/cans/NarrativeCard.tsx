import { useState } from "react";
import { Check, Pencil, Sparkles, X } from "lucide-react";
import { AgentChip, Button, Card, CardBody, CardHeader, Pill, TextArea } from "@/components/ui";
import type { CansAssessment, IntakeRecord } from "@/data/intake/types";
import { useStore } from "@/store";
import { runAgent } from "../lib/agents";
import { NO_RATINGS } from "./cansModel";
import { draftSummary } from "./evidence";

/* The assessor's narrative observations and the agent's evidence summary. The summary is an AI-generated draft until a person accepts it. Missing
   evidence is never treated as a zero, and nothing here rates an item. */

function draftSummaryTask(recordId: string) {
  let taskId: string | null = null;
  taskId = runAgent(recordId, {
    role: "cans", action: "Draft an evidence summary for the narrative", section: "cans", approval: "required", ms: 1300, source: "Accepted CANS evidence",
    work: () => {
      const s = useStore.getState();
      const r = s.intakes.find((x) => x.id === recordId);
      if (!r?.cans) return "No CANS preparation record.";
      const sid = s.proposeCansSummary(recordId, draftSummary(r), "criteria");
      if (taskId) s.updateIntakeTask(recordId, taskId, { gate: { kind: "suggestions", sections: ["cans"], ids: [sid] } });
      return "AI-generated summary drafted from accepted evidence. It waits for a person to accept, edit or reject it.";
    },
  });
}

export function NarrativeCard({ record, cans, readOnly }: { record: IntakeRecord; cans: CansAssessment; readOnly?: boolean }) {
  const setNarrative = useStore((s) => s.setCansNarrative);
  const [text, setText] = useState(cans.narrative);
  const [lastSaved, setLastSaved] = useState(cans.narrative);
  if (cans.narrative !== lastSaved) {
    setLastSaved(cans.narrative);
    setText(cans.narrative);
  }
  const summary = record.suggestions.find((x) => x.section === "cans" && x.field === "narrative" && x.status === "pending");
  const running = record.tasks.some((t) => t.role === "cans" && t.action.startsWith("Draft an evidence summary") && (t.status === "queued" || t.status === "running"));
  return (
    <Card data-cans-ratings>
      <CardHeader title="Narrative" />
      <CardBody className="space-y-4">
        {!cans.template ? (
          <div data-no-ratings className="rounded-xl border border-line bg-tile px-3.5 py-3">
            <p className="text-[14px] font-semibold text-ink">{NO_RATINGS}</p>
            <p className="mt-0.5 text-[13px] text-ink2">Item responses, official scoring options and reviewer sign-off per item appear only after DMAS's item mapping is configured. Agents never assign ratings.</p>
          </div>
        ) : null}
        <div>
          <label htmlFor={`cans-narrative-${record.id}`} className="text-[13px] font-semibold text-ink2">Narrative observations</label>
          <TextArea id={`cans-narrative-${record.id}`} className="mt-1.5" rows={4} value={text} disabled={readOnly || cans.status === "signed"} onChange={(e) => setText(e.target.value)} placeholder="Observations in the assessor's words" />
          {!readOnly && cans.status !== "signed" ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="primary" disabled={text === cans.narrative} onClick={() => setNarrative(record.id, text.trim())}>Save narrative</Button>
              <Button size="sm" icon={Sparkles} loading={running} disabled={!cans.evidence.length} onClick={() => draftSummaryTask(record.id)}>CANS Evidence Agent: draft a summary</Button>
              {!cans.evidence.length ? <span className="self-center text-[12px] text-muted">Accept some evidence first</span> : null}
            </div>
          ) : null}
        </div>
        {summary && !readOnly ? <SummaryDraft record={record} id={summary.id} /> : null}
      </CardBody>
    </Card>
  );
}

function SummaryDraft({ record, id }: { record: IntakeRecord; id: string }) {
  const decide = useStore((s) => s.decideCansSummary);
  const sg = record.suggestions.find((x) => x.id === id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(sg?.value ?? "");
  if (!sg) return null;
  return (
    <div data-summary-draft className="rounded-xl border border-mid-edge bg-mid-bg/50 px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <AgentChip agent={sg.agent} />
        <Pill tone="mid">AI-generated draft · needs review</Pill>
      </div>
      {editing ? (
        <TextArea className="mt-2" rows={6} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Edit the summary" />
      ) : (
        <p className="mt-2 text-[13px] whitespace-pre-line text-ink">{sg.value}</p>
      )}
      <div className="mt-2.5 flex flex-wrap gap-2">
        {editing ? (
          <>
            <Button size="sm" variant="primary" icon={Check} onClick={() => decide(record.id, id, "edited", draft.trim() || sg.value)}>Save edit</Button>
            <Button size="sm" onClick={() => setEditing(false)}>Cancel</Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="primary" icon={Check} onClick={() => decide(record.id, id, "accepted")}>Accept into narrative</Button>
            <Button size="sm" icon={Pencil} onClick={() => setEditing(true)}>Edit</Button>
            <Button size="sm" icon={X} onClick={() => decide(record.id, id, "rejected")}>Reject</Button>
          </>
        )}
      </div>
    </div>
  );
}
