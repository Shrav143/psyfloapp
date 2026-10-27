import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { AgentChip, Button, Card, CardHeader, Pill, TextArea, UnderlineTabs } from "@/components/ui";
import { NOTE_SECTIONS, SECTION_LABEL, type IntakeRecord, type NoteSectionId, type ScribeSession, type Suggestion } from "@/data/intake/types";
import { cn } from "@/lib/cn";
import { useStore } from "@/store";
import { valueOf } from "../shared/provenance";
import { clockOf, extractLabel, SCRIBE_AGENT } from "./engine";

type Tab = "note" | "fields" | "missing";
type Decision = "accepted" | "edited" | "rejected";
const DECIDED: Record<Decision, string> = { accepted: "Accepted", edited: "Edited and accepted", rejected: "Rejected" };

function Decide({ onDecide, initial, label }: { onDecide: (d: Decision, edited?: string) => void; initial: string; label: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(initial);
  if (editing) {
    return (
      <div className="mt-2 space-y-2">
        <TextArea value={text} onChange={(e) => setText(e.target.value)} rows={4} aria-label={`Edit ${label}`} />
        <div className="flex gap-2">
          <Button size="sm" variant="primary" icon={Check} disabled={!text.trim()} onClick={() => { onDecide("edited", text.trim()); setEditing(false); }}>Save edit</Button>
          <Button size="sm" onClick={() => { setEditing(false); setText(initial); }}>Cancel</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <Button size="sm" variant="primary" icon={Check} aria-label={`Accept ${label}`} onClick={() => onDecide("accepted")}>Accept</Button>
      <Button size="sm" icon={Pencil} aria-label={`Edit ${label}`} onClick={() => setEditing(true)}>Edit</Button>
      <Button size="sm" icon={X} aria-label={`Reject ${label}`} onClick={() => onDecide("rejected")}>Reject</Button>
    </div>
  );
}

function NoteBlock({ record, session, id, label, review }: { record: IntakeRecord; session: ScribeSession; id: NoteSectionId; label: string; review: boolean }) {
  const decide = useStore((s) => s.scribeDecideNote);
  const text = session.noteDraft[id];
  const st = session.noteStatus?.[id];
  const risk = id === "risk";
  return (
    <div data-note={id} className={cn("border-b border-line py-3 last:border-b-0", risk && text && "rounded-xl border border-mid-edge bg-mid-bg/40 px-3")}>
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-[14px] font-semibold">{label}</h4>
        {!text ? <Pill>Nothing yet</Pill> : st && st !== "pending" ? <Pill tone={st === "rejected" ? "neutral" : "good"}>{DECIDED[st]}</Pill> : <Pill tone="mid">{review ? "Needs review" : "Drafting"}</Pill>}
      </div>
      {text ? <p className={cn("mt-1 text-[14px] whitespace-pre-line", st === "rejected" && "text-muted line-through")}>{text}</p> : null}
      {risk && text ? <p className="mt-1.5 text-[12px] text-mid-ink">Never a conclusion. A clinician reviews this and documents risk in the assessment.</p> : null}
      {review && text && (!st || st === "pending") ? <Decide label={label} initial={text} onDecide={(d, e) => decide(record.id, id, d, e)} /> : null}
    </div>
  );
}

function ExtractCard({ record, sg, review, onSource }: { record: IntakeRecord; sg: Suggestion; review: boolean; onSource: (turnId: string) => void }) {
  const decide = useStore((s) => s.scribeDecideField);
  const label = extractLabel(record, sg);
  const safety = sg.section === "assessment" && sg.field === "safety";
  const onFile = sg.section === "assessment" || sg.section === "referral" || sg.section === "profile" || sg.section === "coverage" ? valueOf(record, sg.section, sg.field) : "";
  const decided = sg.status !== "pending";
  return (
    <div data-extract={sg.field} className={cn("rounded-xl border px-3.5 py-3", decided ? "border-line bg-tile/40" : safety ? "border-mid-edge bg-mid-bg/50" : "border-line bg-white")}>
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <span className="font-semibold text-ink2">{SECTION_LABEL[sg.section]} · {label}</span>
        <Pill tone={sg.confidence === "high" ? "good" : sg.confidence === "medium" ? "mid" : "risk"}>Confidence: {sg.confidence}</Pill>
        {decided ? <Pill tone={sg.status === "rejected" ? "neutral" : "good"}>{DECIDED[sg.status as Decision]}</Pill> : safety ? <Pill tone="mid">For a clinician to document</Pill> : <Pill tone="mid">AI suggested</Pill>}
      </div>
      <p className={cn("mt-1.5 text-[14px]", sg.status === "rejected" && "text-muted line-through")}>{sg.status === "edited" ? sg.editedValue : sg.value}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
        {sg.source.blockId ? (
          <button type="button" onClick={() => onSource(sg.source.blockId!)} className="font-medium text-forest hover:underline">
            Transcript {clockOf(sg.source.at ?? 0)}
          </button>
        ) : null}
        {sg.source.quote ? <span className="text-muted italic">“{sg.source.quote}”</span> : null}
      </div>
      {onFile && !safety ? <p className="mt-1.5 text-[12px] text-muted">On file now: {onFile}</p> : null}
      {safety ? <p className="mt-1.5 text-[12px] text-mid-ink">It goes to Safety and risk screening as a draft. AI never finalizes risk: a clinician documents it.</p> : null}
      {review && !decided ? (
        safety ? (
          <div className="mt-2">
            <Button size="sm" icon={X} aria-label={`Reject ${label}`} onClick={() => decide(record.id, sg.id, "rejected")}>Reject</Button>
          </div>
        ) : (
          <Decide label={label} initial={sg.value} onDecide={(d, e) => decide(record.id, sg.id, d, e)} />
        )
      ) : null}
    </div>
  );
}

/** Right column: the AI-generated draft. Note sections fill in as the conversation goes; after Stop each section and suggestion is reviewed. */
export function ScribeDraft({ record, session, onSource }: { record: IntakeRecord; session: ScribeSession; onSource: (turnId: string) => void }) {
  const [tab, setTab] = useState<Tab>("note");
  const paused = useStore((s) => s.agentPaused[SCRIBE_AGENT]);
  const review = session.status === "reviewing";
  const fields = session.extracted ?? [];
  const missing = session.missing ?? [];
  const drafted = NOTE_SECTIONS.filter((n) => session.noteDraft[n.id]).length;
  return (
    <Card className="flex min-h-0 flex-col">
      <CardHeader title="Draft" right={<><Pill tone="mid">AI-generated draft</Pill><AgentChip agent={SCRIBE_AGENT} /></>} />
      <div className="px-5">
        <UnderlineTabs<Tab> items={[{ id: "note", label: "Note", badge: `${drafted}/9` }, { id: "fields", label: "Fields", badge: fields.length }, { id: "missing", label: "Missing", badge: missing.length }]} value={tab} onChange={setTab} className="text-[13px]" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
        {paused ? <p className="mb-3 rounded-xl bg-mid-bg px-3 py-2 text-[13px] text-mid-ink">The Clinical Documentation Agent is paused in Settings. The transcript is kept, but nothing is drafted until it is resumed.</p> : null}
        {tab === "note" ? (
          NOTE_SECTIONS.map((n) => <NoteBlock key={n.id} record={record} session={session} id={n.id} label={n.label} review={review} />)
        ) : tab === "fields" ? (
          fields.length ? (
            <div className="space-y-2.5">
              {fields.map((sg) => <ExtractCard key={sg.id} record={record} sg={sg} review={review} onSource={onSource} />)}
            </div>
          ) : (
            <p className="py-8 text-center text-[13px] text-muted">No fields extracted yet. They appear as the conversation covers them.</p>
          )
        ) : missing.length ? (
          <ul className="space-y-2">
            {missing.map((m) => (
              <li key={m} className="flex items-start gap-2 rounded-xl border border-line px-3 py-2 text-[14px]">
                <Pill tone="mid">Missing</Pill>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-[13px] text-muted">Nothing missing so far.</p>
        )}
        {!review && (session.status === "recording" || session.status === "paused") ? <p className="mt-3 text-[12px] text-muted">Review opens when you press Stop. Nothing reaches the intake until a person accepts it.</p> : null}
      </div>
    </Card>
  );
}
