import { useEffect, useRef, useState } from "react";
import { FastForward, Mic, Pause, Play, Square, X } from "lucide-react";
import { Banner, Button, Modal, Pill, Spinner } from "@/components/ui";
import { useEscape } from "@/components/ui/escape";
import type { IntakeRecord, ScribeSession } from "@/data/intake/types";
import type { Tone } from "@/data/types";
import { useStore } from "@/store";
import { programLabelOf } from "@/data/intake/scripts";
import { runAgent } from "../lib/agents";
import { SimulatedTag, SourceLink } from "../shared/provenance";
import { clockOf, fieldsAccepted, FINISH_ACTION, notesAccepted, SCRIBE_AGENT, SECONDS_PER_TICK, TICK_MS } from "./engine";
import { Bubble, LevelMeter, useBodyLock } from "./overlay";
import { RETENTION_NOTE, ScribeConsent } from "./ScribeConsent";
import { ScribeDraft } from "./ScribeDraft";
import { ScribeTranscript } from "./ScribeTranscript";

const STATUS: Record<ScribeSession["status"], { label: string; tone: Tone }> = {
  consent: { label: "Consent needed", tone: "mid" }, ready: { label: "Ready to record", tone: "neutral" }, recording: { label: "Recording (simulated)", tone: "risk" },
  paused: { label: "Paused", tone: "mid" }, stopped: { label: "Preparing the draft", tone: "neutral" }, reviewing: { label: "Review the draft", tone: "mid" }, saved: { label: "Saved to the intake", tone: "good" },
};

/** Starts the agent's last pass over the transcript. Returns false when the agent is paused in Settings. */
export function prepareDraft(id: string): boolean {
  return runAgent(id, { role: "documentation", action: FINISH_ACTION, section: "assessment", source: "AI Scribe transcript", approval: "required", ms: 1400, work: () => useStore.getState().scribeFinishDraft(id) }) !== null;
}

/** The ambient AI Scribe, full screen over the record: consent, then the live transcript beside the AI-generated draft, then review.
    Esc closes it; while recording it pauses first and asks. Closing or leaving the page pauses a recording. */
export function ScribePanel(props: { record: IntakeRecord; onClose: () => void }) {
  /* Keyed by record, so local view state (reply mode, highlight, dialogs) never carries over to another intake. */
  return <ScribePanelView key={props.record.id} {...props} />;
}

function ScribePanelView({ record, onClose }: { record: IntakeRecord; onClose: () => void }) {
  const st = useStore.getState();
  const s = record.scribe;
  const status = s?.status ?? "consent";
  const [confirmClose, setConfirmClose] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const statusRef = useRef(status);
  statusRef.current = status;
  const finishing = record.tasks.some((t) => t.action === FINISH_ACTION && (t.status === "queued" || t.status === "running"));
  const agentPaused = useStore((x) => x.agentPaused[SCRIBE_AGENT]);
  useBodyLock();

  useEffect(() => {
    if (status !== "recording") return;
    const t = window.setInterval(() => useStore.getState().scribeAdvance(record.id, SECONDS_PER_TICK), TICK_MS);
    return () => window.clearInterval(t);
  }, [status, record.id]);
  useEffect(
    () => () => {
      if (statusRef.current === "recording") useStore.getState().scribePause(record.id);
    },
    [record.id],
  );

  const requestClose = () => {
    if (statusRef.current === "recording") {
      st.scribePause(record.id);
      setConfirmClose(true);
      return;
    }
    onClose();
  };
  useEscape(!confirmClose, requestClose);

  const stop = () => {
    st.scribeStop(record.id);
    if (!prepareDraft(record.id)) st.toast({ title: "The draft was not prepared", body: "The Clinical Documentation Agent is paused in Settings. The transcript is kept.", tone: "mid" });
  };
  const saveApproved = () => {
    const out = st.scribeSaveApproved(record.id);
    st.toast({ title: "Saved to the intake", body: `${out.accepted} approved items written with their transcript source. ${out.waiting ? `${out.waiting} proposals wait for review where they belong${out.routed ? ` (${out.routed} as pending evidence in their modules)` : ""}.` : "Nothing else is waiting."}`, tone: "good" });
  };
  const accepted = s ? notesAccepted(s).length + fieldsAccepted(s).length : 0;
  const pendingCount = s ? Object.values(s.noteStatus ?? {}).filter((x) => x === "pending").length + (s.extracted ?? []).filter((x) => x.status === "pending").length : 0;
  const meta = STATUS[status];
  const live = status === "recording" || status === "paused";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas" role="dialog" aria-modal="true" aria-labelledby="scribe-title">
      <header className="border-b border-edge bg-white px-4 py-3 min-[900px]:px-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Bubble icon={Mic} className="bg-sage-bg text-forest" />
          <h2 id="scribe-title" className="text-[18px] font-semibold">Record Intake</h2>
          <span className="text-[14px] text-ink2">{record.id} · {record.initials || "No patient yet"}{record.age !== null ? `, ${record.age}` : ""}{programLabelOf(record) ? ` · ${programLabelOf(record)}` : ""}</span>
          <Pill tone={meta.tone} dot={status === "recording"}>{meta.label}</Pill>
          <SimulatedTag what="Simulated" />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {s && status !== "consent" ? (
              <>
                {live || status === "ready" ? <LevelMeter active={status === "recording"} /> : null}
                <span className="min-w-[52px] text-[16px] font-semibold tabular-nums" aria-label={`Elapsed ${clockOf(s.elapsed)}`}>{clockOf(s.elapsed)}</span>
                {status === "ready" ? <Button variant="primary" icon={Mic} onClick={() => st.scribeStart(record.id)}>Start</Button> : null}
                {status === "recording" ? <Button icon={Pause} onClick={() => st.scribePause(record.id)}>Pause</Button> : null}
                {status === "paused" ? <Button variant="primary" icon={Play} onClick={() => st.scribeResume(record.id)}>Resume</Button> : null}
                {live ? <Button variant="danger" icon={Square} onClick={stop}>Stop</Button> : null}
                {status === "recording" ? <Button variant="ghost" icon={FastForward} onClick={() => st.scribeSkip(record.id)}>Skip ahead (demo)</Button> : null}
              </>
            ) : null}
            <button type="button" onClick={requestClose} aria-label="Close the AI Scribe" className="grid h-9 w-9 place-items-center rounded-xl border border-field bg-white text-ink2 hover:bg-tile">
              <X size={18} className="ico" />
            </button>
          </div>
        </div>
        <p className="mt-1.5 text-[12px] font-medium text-muted">Simulated: no audio is recorded. Nothing leaves this browser. AI Scribe proposals are drafts until a person accepts them.</p>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        {!s || status === "consent" ? (
          <ScribeConsent record={record} onDeclined={onClose} />
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-3 p-4 min-[900px]:p-5">
            {record.safety?.status === "open" && live ? (
              <Banner tone="risk" title="A safety alert is open for a clinician">The scribe keeps listening. It does not decide anything about risk; the clinician does.</Banner>
            ) : null}
            {status === "stopped" ? (
              <Banner tone={finishing ? "neutral" : "mid"} title={finishing ? "The Clinical Documentation Agent is preparing the draft" : "The draft is not prepared yet"}
                action={finishing ? <Spinner /> : <Button size="sm" variant="primary" disabled={agentPaused} onClick={() => prepareDraft(record.id)}>Prepare the draft</Button>}>
                {finishing ? "Summary, outstanding questions and plan." : agentPaused ? "The agent is paused in Settings. Resume it, then prepare the draft." : "Prepare it to start the review."}
              </Banner>
            ) : null}
            {status === "saved" ? (
              <Banner tone="good" title="Saved to the intake" action={<Button size="sm" onClick={() => st.scribeNew(record.id)}>Start a new session</Button>}>
                Only what a person accepted was written, with its transcript source. Undecided proposals wait as pending evidence in their modules or as suggestions in their sections.{" "}
                {s.docIds?.map((d) => {
                  const doc = record.documents.find((x) => x.id === d);
                  return doc ? <SourceLink key={d} record={record} source={{ kind: "document", ref: doc.name, docId: d }} className="mr-3" /> : null;
                })}
              </Banner>
            ) : null}
            <div className="grid min-h-[420px] flex-1 grid-cols-1 gap-4 min-[900px]:min-h-0 min-[900px]:grid-cols-2">
              <ScribeTranscript record={record} session={s} highlight={highlight} />
              <ScribeDraft record={record} session={s} onSource={(id) => setHighlight(id)} />
            </div>
          </div>
        )}
      </main>

      {s && (status === "reviewing" || status === "saved" || live) ? (
        <footer className="flex flex-wrap items-center gap-3 border-t border-edge bg-white px-4 py-3 min-[900px]:px-6">
          <p className="min-w-0 flex-1 text-[12px] text-muted">{RETENTION_NOTE}</p>
          {status === "reviewing" ? (
            <>
              <span className="text-[12px] text-ink2">{accepted} accepted · {pendingCount} not decided</span>
              <Button onClick={() => { st.scribeSaveDraft(record.id); st.toast({ title: "Draft saved", body: "The session is kept for review. Nothing was written to the intake.", tone: "neutral" }); }}>Save draft</Button>
              <Button variant="primary" disabled={!accepted && !pendingCount} title="Accepted items are written. The rest waits as pending evidence or suggestions where it belongs." onClick={saveApproved}>Save to the intake</Button>
            </>
          ) : status === "saved" ? (
            <Button variant="primary" onClick={onClose}>Back to the record</Button>
          ) : null}
        </footer>
      ) : null}

      <Modal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        title="Recording paused"
        size="sm"
        footer={
          <>
            <Button onClick={() => { setConfirmClose(false); st.scribeResume(record.id); }}>Resume recording</Button>
            <Button variant="primary" onClick={() => { setConfirmClose(false); onClose(); }}>Close the scribe</Button>
          </>
        }
      >
        <p className="text-[14px]">The recording is paused at {clockOf(s?.elapsed ?? 0)}. You can close the scribe and resume later from the record; the transcript and draft are kept.</p>
      </Modal>
    </div>
  );
}
