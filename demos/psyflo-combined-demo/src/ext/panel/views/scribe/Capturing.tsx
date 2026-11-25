import { Pause, Play } from "lucide-react";
import { useStore } from "@/ext/store";
import { StageHeading, Transcript, count, type ScribeCtx } from "./shared";

/** Recording (or dictating): the orb, the clock of the last heard line, and the transcript so far. */
export default function Capturing({ ctx }: { ctx: ScribeCtx }) {
  const { scenario, spec, consumer } = ctx;
  const shown = useStore((s) => s.scribe.shown);
  const paused = useStore((s) => s.scribe.paused);
  const mode = useStore((s) => s.scribe.mode);
  const scribePause = useStore((s) => s.scribePause);
  const scribeComplete = useStore((s) => s.scribeComplete);

  const heard = scenario.lines.slice(0, shown);
  const clock = shown > 0 ? scenario.lines[shown - 1]?.t ?? "0:00" : "0:00";
  const done = shown >= scenario.lines.length;
  const canComplete = shown >= 2;
  const dictating = mode === "dictation";

  return (
    <div className="scr-root">
      <div className="scr-capt">
        <div className="scr-top">
          <div className={`p-orb${paused ? " paused" : ""}`} aria-hidden="true" />
          <div className="scr-meta">
            <StageHeading className="scr-h">{dictating ? "Dictating" : "Recording"}</StageHeading>
            <div className="scr-timer" data-testid="scribe-timer" aria-label={`Recording time ${clock}`}>{clock}</div>
            <div className="scr-status" data-testid="scribe-status">{paused ? "Paused" : done ? "End of the demo recording" : "Listening…"}</div>
            <div className="p-note scr-ctxline">{spec.short}{consumer ? ` · ${consumer.ini}` : ""}</div>
          </div>
        </div>

        <div className="scr-lbl-row">
          <span className="p-h" style={{ margin: 0 }} id="scr-tr-lbl">{dictating ? "What you said" : "Transcript so far"}</span>
          <span className="p-note" aria-hidden="true">{count(shown, "line")}</span>
        </div>
        <Transcript lines={heard} speakers={!dictating} follow live label={dictating ? "What you said so far" : "Transcript so far"} className="grow" />
        {done ? <p className="p-note scr-end">That is all the demo recording has. Press Complete session.</p> : null}
      </div>

      <div className="psy-foot">
        <div className="p-row scr-btns">
          <button type="button" className="p-btn p-grow" data-testid="scribe-pause" aria-pressed={paused} onClick={() => scribePause(!paused)}>
            {paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}{paused ? "Resume" : "Pause"}
          </button>
          <button type="button" className="p-btn pri p-grow" data-testid="scribe-complete" disabled={!canComplete} onClick={scribeComplete}>Complete session</button>
        </div>
        {!canComplete ? <p className="p-note" style={{ margin: 0 }}>You can complete the session once two lines have been heard.</p> : null}
      </div>
    </div>
  );
}
