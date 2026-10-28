import { useState } from "react";
import { AgentChip, Card, CardHeader, Pill, UnderlineTabs } from "@/components/ui";
import { NOTE_SECTIONS, type IntakeRecord, type NoteSectionId, type ScribeSession } from "@/data/intake/types";
import { cn } from "@/lib/cn";
import { useStore } from "@/store";
import { SimulatedTag } from "../shared/provenance";
import { detectedTopics, SCRIBE_AGENT } from "./engine";
import { Decide, ScribeFields } from "./ScribeFields";
import { ScribeMissing } from "./ScribeMissing";

type Tab = "note" | "fields" | "missing";
const DECIDED: Record<"accepted" | "edited" | "rejected", string> = { accepted: "Accepted", edited: "Edited and accepted", rejected: "Rejected" };

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

/** Right column: the AI-generated draft. The topics the interview has covered, the note sections that fill in as the conversation goes, the proposals by where they go, and what is
    still missing. After Stop each section and proposal is reviewed; nothing reaches the intake until a person accepts it. */
export function ScribeDraft({ record, session, onSource }: { record: IntakeRecord; session: ScribeSession; onSource: (turnId: string) => void }) {
  const [tab, setTab] = useState<Tab>("note");
  const paused = useStore((s) => s.agentPaused[SCRIBE_AGENT]);
  const review = session.status === "reviewing";
  const fields = session.extracted ?? [];
  const missing = session.missing ?? [];
  const drafted = NOTE_SECTIONS.filter((n) => session.noteDraft[n.id]).length;
  const topics = detectedTopics(record, session);
  const live = session.status === "recording" || session.status === "paused";
  return (
    <Card className="flex min-h-0 flex-col">
      <CardHeader title="Draft" right={<><Pill tone="mid">AI-generated draft</Pill><AgentChip agent={SCRIBE_AGENT} /></>} />
      {topics.length && (live || review) ? (
        <div className="border-b border-line px-5 py-2.5" data-testid="detected-topics">
          <p className="text-[12px] font-semibold text-ink2">Detected documentation <span className="font-normal text-muted">({topics.filter((t) => t.covered).length} of {topics.length} topics)</span></p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {topics.map((t) => <li key={t.label}><Pill tone={t.covered ? "good" : "neutral"} className={t.covered ? undefined : "opacity-70"}>{t.label}</Pill></li>)}
          </ul>
        </div>
      ) : null}
      <div className="px-5">
        <UnderlineTabs<Tab> items={[{ id: "note", label: "Note", badge: `${drafted}/9` }, { id: "fields", label: "Proposals", badge: fields.length }, { id: "missing", label: "Missing", badge: missing.length }]} value={tab} onChange={setTab} className="text-[13px]" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
        {paused ? <p className="mb-3 rounded-xl bg-mid-bg px-3 py-2 text-[13px] text-mid-ink">The Clinical Documentation Agent is paused in Settings. The transcript is kept, but nothing is drafted until it is resumed.</p> : null}
        {tab === "note" ? (
          NOTE_SECTIONS.map((n) => <NoteBlock key={n.id} record={record} session={session} id={n.id} label={n.label} review={review} />)
        ) : tab === "fields" ? (
          <ScribeFields record={record} session={session} review={review} onSource={onSource} />
        ) : (
          <ScribeMissing record={record} session={session} canDecide={session.status !== "saved"} />
        )}
        {!review && live ? <p className="mt-3 text-[12px] text-muted">Review opens when you press Stop. Nothing reaches the intake until a person accepts it. <SimulatedTag what="Simulated" /></p> : null}
      </div>
    </Card>
  );
}
