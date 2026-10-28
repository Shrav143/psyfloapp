import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { Button, Card, CardHeader, InfoTip, Pill, TextArea } from "@/components/ui";
import type { IntakeRecord, ScribeSession, TranscriptTurn } from "@/data/intake/types";
import { cn } from "@/lib/cn";
import { useStore } from "@/store";
import { actorName, SimulatedTag } from "../shared/provenance";
import { clockOf, scriptDone, scriptOf, speakerLabel, turnIndex } from "./engine";

const SPEAKERS: TranscriptTurn["speaker"][] = ["clinician", "patient", "caregiver", "unknown"];

function TurnText({ recordId, turn, canEdit }: { recordId: string; turn: TranscriptTurn; canEdit: boolean }) {
  const edit = useStore((s) => s.scribeEditTurn);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(turn.text);
  if (open) {
    return (
      <div className="mt-1 space-y-2">
        <TextArea value={text} onChange={(e) => setText(e.target.value)} rows={3} aria-label={`Correct the transcript at ${clockOf(turn.at)}`} />
        <div className="flex gap-2">
          <Button size="sm" variant="primary" disabled={!text.trim()} onClick={() => { edit(recordId, turn.id, text); setOpen(false); }}>Save correction</Button>
          <Button size="sm" onClick={() => { setText(turn.text); setOpen(false); }}>Cancel</Button>
        </div>
      </div>
    );
  }
  return (
    <>
      <p className="mt-1 text-[14px] leading-snug">{turn.text}</p>
      {turn.edited ? <p className="mt-1 text-[12px] text-mid-ink" title={`Original: ${turn.edited.original}`}>Corrected by {actorName(turn.edited.by)}. The original is kept. Proposals from this line need checking again.</p> : null}
      {canEdit ? (
        <button type="button" onClick={() => { setText(turn.text); setOpen(true); }} className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-forest hover:underline" aria-label={`Edit the transcript at ${clockOf(turn.at)}`}>
          <Pencil size={12} className="ico" />
          Correct
        </button>
      ) : null}
    </>
  );
}

/** Left column: the live transcript with speaker labels and timestamps. It is simulated, so a person can correct a speaker label or the words. */
export function ScribeTranscript({ record, session, highlight }: { record: IntakeRecord; session: ScribeSession; highlight: string | null }) {
  const relabel = useStore((s) => s.scribeRelabel);
  const script = scriptOf(record);
  const box = useRef<HTMLDivElement>(null);
  const speakers = SPEAKERS.filter((sp) => script.labels[sp]);
  const recording = session.status === "recording";
  const canEdit = !recording && session.status !== "saved";

  useEffect(() => {
    if (recording && box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [session.turns.length, recording]);
  useEffect(() => {
    if (!highlight) return;
    document.getElementById(`turn-${highlight}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlight]);

  return (
    <Card className="flex min-h-0 flex-col">
      <CardHeader
        title="Live transcript"
        right={
          <>
            <span className="text-[12px] text-muted">{session.turns.length} turns</span>
            <SimulatedTag what="Simulated transcript" />
            <InfoTip label="About the transcript" align="end">The transcript is simulated and can be wrong. Pick the right speaker for any turn, and correct the words while the recording is paused or stopped; each correction is kept in the audit trail with the original.</InfoTip>
          </>
        }
      />
      <div ref={box} className="min-h-0 flex-1 overflow-y-auto px-5 py-3" aria-live="polite">
        {!session.turns.length ? (
          <p className="py-10 text-center text-[13px] text-muted">{session.status === "ready" ? "Press Start when the conversation begins. The simulated conversation plays here." : "No turns yet."}</p>
        ) : (
          <ol className="space-y-3">
            {session.turns.map((t) => {
              const heard = script.turns[turnIndex(t.id)]?.heardAs;
              const check = heard !== undefined && t.speaker === heard;
              return (
                <li key={t.id} id={`turn-${t.id}`} className={cn("rounded-xl px-3 py-2", highlight === t.id ? "bg-sage-bg outline-2 outline-forest/40" : t.speaker === "clinician" ? "bg-tile" : "")}>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label={`Speaker at ${clockOf(t.at)}`}
                      value={t.speaker}
                      onChange={(e) => relabel(record.id, t.id, e.target.value as TranscriptTurn["speaker"])}
                      className="h-7 rounded-lg border border-line bg-white px-1.5 text-[12px] font-semibold text-ink2"
                    >
                      {speakers.map((sp) => <option key={sp} value={sp}>{speakerLabel(script, sp)}</option>)}
                    </select>
                    <span className="text-[12px] tabular-nums text-muted">{clockOf(t.at)}</span>
                    {check ? <Pill tone="mid">Speaker uncertain, check it</Pill> : null}
                  </div>
                  <TurnText recordId={record.id} turn={t} canEdit={canEdit} />
                </li>
              );
            })}
          </ol>
        )}
        {recording ? (
          <p className="mt-3 flex items-center gap-2 text-[12px] text-muted">
            <span className="psy-pulse inline-block h-2 w-2 rounded-full bg-risk" aria-hidden="true" />
            {scriptDone(record, session) ? "The scripted conversation has ended. Press Stop to review the draft." : "Listening (simulated)"}
          </p>
        ) : session.status === "paused" ? (
          <p className="mt-3 text-[12px] font-semibold text-mid-ink">Paused. Nothing is added until you resume.</p>
        ) : null}
      </div>
    </Card>
  );
}
