import { TriangleAlert } from "lucide-react";
import { useStore } from "@/store";
import { StageHeading, type ScribeCtx } from "./shared";

/** The person left the document while recording. The captured lines are kept; they can resume or discard. */
export default function Recover({ ctx }: { ctx: ScribeCtx }) {
  const { spec, consumer } = ctx;
  const shown = useStore((s) => s.scribe.shown);
  const scribeResume = useStore((s) => s.scribeResume);
  const scribeDiscard = useStore((s) => s.scribeDiscard);
  return (
    <div className="psy-body">
      <section className="p-card scr-recover">
        <StageHeading>Recover session</StageHeading>
        <p className="scr-off" role="status"><TriangleAlert size={16} aria-hidden="true" /><span>Your recording was interrupted. {shown} {shown === 1 ? "line was" : "lines were"} captured.</span></p>
        <div className="scr-kv">
          <div><span className="k">Document:</span> <b>{spec.short}{consumer ? ` · ${consumer.ini}` : ""}</b></div>
        </div>
        <p className="p-note scr-mt">Resume takes you back to that document and keeps recording.</p>
        <div className="p-col scr-mt">
          <button type="button" className="p-btn pri block" data-testid="scribe-resume" onClick={scribeResume}>Resume recording</button>
          <button type="button" className="p-btn block" data-testid="scribe-discard" onClick={scribeDiscard}>Discard</button>
        </div>
      </section>
    </div>
  );
}
