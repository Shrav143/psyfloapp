import { useEffect, useRef } from "react";
import { Card, CardHeader, InfoTip, Pill } from "@/components/ui";
import type { IntakeRecord, ScribeSession, TranscriptTurn } from "@/data/intake/types";
import { cn } from "@/lib/cn";
import { useStore } from "@/store";
import { clockOf, scriptDone, scriptOf, speakerLabel, turnIndex } from "./engine";

const SPEAKERS: TranscriptTurn["speaker"][] = ["clinician", "patient", "caregiver", "unknown"];

/** Left column: the live transcript with speaker labels and timestamps. A label can be corrected, since speaker identification can be wrong. */
export function ScribeTranscript({ record, session, highlight }: { record: IntakeRecord; session: ScribeSession; highlight: string | null }) {
  const relabel = useStore((s) => s.scribeRelabel);
  const script = scriptOf(record);
  const box = useRef<HTMLDivElement>(null);
  const speakers = SPEAKERS.filter((sp) => script.labels[sp]);
  const recording = session.status === "recording";

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
            <InfoTip label="About speaker labels" align="end">Speaker identification is simulated and can be wrong. Pick the right speaker for any turn; the correction is kept in the audit trail.</InfoTip>
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
                  <p className="mt-1 text-[14px] leading-snug">{t.text}</p>
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
